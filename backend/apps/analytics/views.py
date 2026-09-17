"""Admin dashboard and analytics aggregates (Phase 12).

Both endpoints read exclusively from committed business data (orders,
products, coupons, customers) and never fan out to external services. The
payload shapes are documented for the admin dashboard app.

Money fields are formatted as decimal strings so JSON consumers never deal
with floats (matching every other SriPon endpoint).
"""
from datetime import datetime, timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView

from apps.orders.models import Order, OrderItem
from apps.products.models import Inventory, Product
from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsActiveAdmin
from apps.users.models import UserProfile
from config.pagination import success_response


PAID = Q(payment_status__in=["PAID", "PARTIALLY_REFUNDED"])


def _date_range(request):
    """Parse optional ``start_date``/``end_date`` (YYYY-MM-DD) from the query.

    Returns a tuple of timezone-aware datetimes (start, end); each may be None.
    An inclusive end-of-day is used for the end boundary.
    """
    start = request.query_params.get("start_date", "").strip()
    end = request.query_params.get("end_date", "").strip()
    start_dt = end_dt = None
    for raw, attr in ((start, "start_dt"), (end, "end_dt")):
        if not raw:
            continue
        try:
            parsed = datetime.strptime(raw, "%Y-%m-%d")
        except ValueError:
            continue
        if attr == "start_dt":
            start_dt = timezone.make_aware(parsed)
        else:
            end_dt = timezone.make_aware(parsed).replace(
                hour=23, minute=59, second=59, microsecond=999999
            )
    return start_dt, end_dt


def _aov(order_count, revenue):
    """Average order value as a decimal string; 0 when there are no orders."""
    if not order_count:
        return "0"
    return str((revenue or Decimal("0")) / Decimal(order_count))


class DashboardAggregateView(APIView):
    """GET /admin/dashboard/ - headline KPIs for the admin home screen."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsActiveAdmin]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_dt, end_dt = _date_range(request)
        paid = PAID

        orders = Order.objects.all()
        if start_dt:
            orders = orders.filter(placed_at__gte=start_dt)
        if end_dt:
            orders = orders.filter(placed_at__lte=end_dt)
        paid_orders = orders.filter(paid)
        today_orders = Order.objects.filter(placed_at__gte=today_start)
        today_paid = today_orders.filter(paid)

        revenue_agg = paid_orders.aggregate(total=Coalesce(Sum("total"), Value(Decimal("0"))))
        today_agg = today_paid.aggregate(total=Coalesce(Sum("total"), Value(Decimal("0"))))

        pending = orders.filter(order_status__in=["PENDING", "CONFIRMED"]).count()
        processing = orders.filter(
            order_status__in=["PROCESSING", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"]
        ).count()

        product_stats = Product.objects.aggregate(
            total=Count("id"),
            active=Count("id", filter=Q(is_active=True)),
        )
        inventory = Inventory.objects.all()
        low_stock = sum(1 for item in inventory if item.is_low_stock)
        out_of_stock = sum(1 for item in inventory if item.is_out_of_stock)

        trend_start = today_start - timedelta(days=13)
        trend_rows = (
            Order.objects.filter(placed_at__gte=trend_start)
            .annotate(day=TruncDate("placed_at"))
            .values("day")
            .annotate(
                orders=Count("id"),
                revenue=Sum("total", filter=paid),
            )
            .order_by("day")
        )
        trend_map = {
            row["day"]: {
                "orders": row["orders"],
                "revenue": str(row["revenue"] or Decimal("0")),
            }
            for row in trend_rows
        }
        sales_trend = []
        for offset in range(14):
            day = (today_start - timedelta(days=13 - offset)).date()
            entry = trend_map.get(day, {"orders": 0, "revenue": "0"})
            entry["date"] = day.isoformat()
            sales_trend.append(entry)

        recent = (
            Order.objects.select_related("customer")
            .order_by("-placed_at")[:5]
        )
        from apps.orders.serializers import AdminOrderSummarySerializer

        return success_response(
            {
                "stats": {
                    "total_revenue": str(revenue_agg["total"]),
                    "total_orders": orders.count(),
                    "average_order_value": _aov(
                        paid_orders.count(), revenue_agg["total"]
                    ),
                    "pending_orders": pending,
                    "processing_orders": processing,
                    "today_revenue": str(today_agg["total"]),
                    "today_orders": today_orders.count(),
                    "total_customers": UserProfile.objects.filter(active=True).count(),
                    "total_products": product_stats["total"],
                    "active_products": product_stats["active"],
                    "low_stock_products": low_stock,
                    "out_of_stock_products": out_of_stock,
                },
                "sales_trend": sales_trend,
                "recent_orders": AdminOrderSummarySerializer(recent, many=True).data,
            }
        )


class AnalyticsTrendView(APIView):
    """GET /admin/analytics/ - sales trend with date filtering.

    Query params:
        days         - window size in days (1..90, default 30)
        start_date   - optional inclusive start (YYYY-MM-DD)
        end_date     - optional inclusive end (YYYY-MM-DD)
        granularity  - day | week | month (default day)
    """

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsActiveAdmin]

    _GRANULARITY = {"day": TruncDate, "week": None, "month": None}

    def get(self, request):
        days_param = request.query_params.get("days", "30")
        try:
            days = max(1, min(int(days_param), 90))
        except ValueError:
            days = 30
        granularity = request.query_params.get("granularity", "day").lower()
        if granularity not in ("day", "week", "month"):
            granularity = "day"

        start_dt, end_dt = _date_range(request)
        if start_dt is None:
            start_dt = timezone.now().replace(
                hour=0, minute=0, second=0, microsecond=0
            ) - timedelta(days=days - 1)
        if end_dt is None:
            end_dt = timezone.now()
        paid = PAID

        queryset = Order.objects.filter(
            placed_at__gte=start_dt, placed_at__lte=end_dt
        )

        if granularity == "week":
            from django.db.models.functions import TruncWeek

            trunc = TruncWeek("placed_at")
        elif granularity == "month":
            from django.db.models.functions import TruncMonth

            trunc = TruncMonth("placed_at")
        else:
            trunc = TruncDate("placed_at")

        rows = (
            queryset.annotate(bucket=trunc)
            .values("bucket")
            .annotate(
                orders=Count("id"),
                revenue=Sum("total", filter=paid),
                items=Sum("items__quantity"),
            )
            .order_by("bucket")
        )
        trend = [
            {
                "date": row["bucket"].isoformat() if row["bucket"] else None,
                "orders": row["orders"],
                "revenue": str(row["revenue"] or Decimal("0")),
                "items": row["items"] or 0,
                "aov": _aov(row["orders"], row["revenue"]),
            }
            for row in rows
        ]

        status_counts = (
            queryset.values("order_status")
            .annotate(count=Count("id"))
            .order_by("order_status")
        )
        payment_counts = (
            queryset.values("payment_status")
            .annotate(count=Count("id"))
            .order_by("payment_status")
        )
        provider_counts = (
            queryset.values("payments__provider")
            .annotate(count=Count("id", distinct=True))
            .order_by("payments__provider")
        )
        paid_orders = queryset.filter(paid)
        paid_revenue = paid_orders.aggregate(
            total=Coalesce(Sum("total"), Value(Decimal("0")))
        )["total"]

        return success_response(
            {
                "days": days,
                "granularity": granularity,
                "trend": trend,
                "order_status_counts": list(status_counts),
                "payment_status_counts": list(payment_counts),
                "payment_provider_counts": list(provider_counts),
                "summary": {
                    "orders": queryset.count(),
                    "revenue": str(paid_revenue),
                    "aov": _aov(paid_orders.count(), paid_revenue),
                },
            }
        )


class CategorySalesView(APIView):
    """GET /admin/analytics/category-sales/ - revenue/units by category.

    Optional ``start_date``/``end_date`` narrow the window. Only paid orders
    contribute revenue.
    """

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsActiveAdmin]

    def get(self, request):
        start_dt, end_dt = _date_range(request)
        items = OrderItem.objects.select_related("product__category")
        if start_dt:
            items = items.filter(order__placed_at__gte=start_dt)
        if end_dt:
            items = items.filter(order__placed_at__lte=end_dt)
        items = items.filter(order__payment_status__in=["PAID", "PARTIALLY_REFUNDED"])

        rows = (
            items.values("product__category_id", "product__category__name")
            .annotate(
                units=Sum("quantity"),
                revenue=Sum("line_total"),
            )
            .filter(revenue__gt=0)
            .order_by("-revenue")
        )
        return success_response(
            [
                {
                    "category_id": row["product__category_id"],
                    "category_name": row["product__category__name"] or "Uncategorised",
                    "units": row["units"] or 0,
                    "revenue": str(row["revenue"] or Decimal("0")),
                }
                for row in rows
            ]
        )


class TopProductsView(APIView):
    """GET /admin/analytics/top-products/ - best sellers by revenue/qty."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsActiveAdmin]

    def get(self, request):
        limit_param = request.query_params.get("limit", "10")
        try:
            limit = max(1, min(int(limit_param), 50))
        except ValueError:
            limit = 10

        rows = (
            Product.objects.annotate(
                _units=Coalesce(
                    Sum("order_items__quantity"), Value(0), output_field=DecimalField()
                ),
                _revenue=Coalesce(
                    Sum("order_items__line_total"), Value(Decimal("0"))
                ),
            )
            .filter(_units__gt=0)
            .order_by("-_units")[:limit]
        )

        return success_response(
            [
                {
                    "id": product.pk,
                    "name": product.name,
                    "sku": product.sku,
                    "units_sold": int(product._units),
                    "revenue": str(product._revenue),
                }
                for product in rows
            ]
        )


class TopCustomersView(APIView):
    """GET /admin/analytics/top-customers/ - best customers by spend."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsActiveAdmin]

    def get(self, request):
        limit_param = request.query_params.get("limit", "10")
        try:
            limit = max(1, min(int(limit_param), 50))
        except ValueError:
            limit = 10

        rows = (
            Order.objects.select_related("customer")
            .values("customer_id", "customer__name", "customer__email")
            .annotate(
                order_count=Count("id"),
                spent=Sum(
                    "total",
                    filter=Q(payment_status__in=["PAID", "PARTIALLY_REFUNDED"]),
                ),
            )
            .filter(spent__gt=0)
            .order_by("-spent")[:limit]
        )

        return success_response(
            [
                {
                    "customer_id": row["customer_id"],
                    "name": row["customer__name"] or "",
                    "email": row["customer__email"] or "",
                    "orders": row["order_count"],
                    "spent": str(row["spent"] or Decimal("0")),
                }
                for row in rows
            ]
        )