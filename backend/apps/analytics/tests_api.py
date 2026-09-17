"""Phase 12 admin dashboard & analytics endpoint tests."""
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.orders.models import Order, OrderItem
from apps.products.models import Inventory, Product
from apps.users.models import AdminUser, UserProfile


class AnalyticsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = AdminUser.objects.create(
            supabase_uid="admin-analytics",
            email="analytics@sripon.test",
            role=AdminUser.Role.ADMIN,
            active=True,
        )
        self.analyst = AdminUser.objects.create(
            supabase_uid="analyst-1",
            email="analyst@sripon.test",
            role=AdminUser.Role.ANALYST,
            active=True,
        )
        self.customer = UserProfile.objects.create(
            firebase_uid="cust-analytics", name="Ravi", email="ravi@sripon.test"
        )
        self.product = Product.objects.create(
            sku="FW-100", name="Rocket Pack", slug="rocket-pack",
            price=Decimal("100.00"), stock_quantity=50,
        )
        Inventory.objects.create(product=self.product, stock_quantity=50)
        self.order = Order.objects.create(
            order_number="SP-20260917-AAA001",
            customer=self.customer,
            address_snapshot={"city": "Chennai"},
            subtotal=Decimal("200.00"),
            total=Decimal("200.00"),
            payment_status="PAID",
            order_status="PENDING",
            placed_at=timezone.now(),
        )
        OrderItem.objects.create(
            order=self.order,
            product=self.product,
            name="Rocket Pack",
            sku="FW-100",
            unit_price=Decimal("100.00"),
            quantity=2,
            final_price=Decimal("100.00"),
            line_total=Decimal("200.00"),
        )
        self.client.force_authenticate(user=self.admin)

    def test_dashboard_requires_admin(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/admin/dashboard/")
        self.assertEqual(response.status_code, 401)

    def test_dashboard_stats(self):
        response = self.client.get("/api/v1/admin/dashboard/")
        self.assertEqual(response.status_code, 200)
        stats = response.data["data"]["stats"]
        self.assertEqual(stats["total_orders"], 1)
        self.assertEqual(stats["total_revenue"], "200")
        self.assertEqual(stats["average_order_value"], "200")
        self.assertEqual(stats["total_customers"], 1)
        self.assertEqual(stats["total_products"], 1)
        self.assertEqual(len(response.data["data"]["sales_trend"]), 14)
        self.assertEqual(len(response.data["data"]["recent_orders"]), 1)

    def test_analytics_trend_default_window(self):
        response = self.client.get("/api/v1/admin/analytics/")
        self.assertEqual(response.status_code, 200)
        data = response.data["data"]
        self.assertEqual(data["days"], 30)
        self.assertEqual(data["granularity"], "day")
        self.assertEqual(data["summary"]["orders"], 1)
        self.assertEqual(data["summary"]["revenue"], "200")
        self.assertEqual(data["summary"]["aov"], "200")
        self.assertTrue(any(t["orders"] == 1 for t in data["trend"]))
        self.assertIn("payment_provider_counts", data)

    def test_analytics_trend_bad_days_falls_back(self):
        response = self.client.get("/api/v1/admin/analytics/?days=nope")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["days"], 30)

    def test_analytics_trend_clamped(self):
        response = self.client.get("/api/v1/admin/analytics/?days=500")
        self.assertEqual(response.data["data"]["days"], 90)

    def test_analytics_trend_date_range(self):
        response = self.client.get(
            "/api/v1/admin/analytics/",
            {"start_date": "2026-09-01", "end_date": "2026-09-17"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["summary"]["orders"], 1)

    def test_category_sales(self):
        response = self.client.get("/api/v1/admin/analytics/category-sales/")
        self.assertEqual(response.status_code, 200)
        rows = response.data["data"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["units"], 2)
        self.assertEqual(rows[0]["revenue"], "200")

    def test_top_products(self):
        response = self.client.get("/api/v1/admin/analytics/top-products/")
        self.assertEqual(response.status_code, 200)
        rows = response.data["data"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["units_sold"], 2)
        self.assertEqual(rows[0]["revenue"], "200")

    def test_top_customers(self):
        response = self.client.get("/api/v1/admin/analytics/top-customers/")
        self.assertEqual(response.status_code, 200)
        rows = response.data["data"]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["orders"], 1)
        self.assertEqual(rows[0]["spent"], "200")

    def test_analyst_can_view_dashboard(self):
        self.client.force_authenticate(user=self.analyst)
        response = self.client.get("/api/v1/admin/dashboard/")
        self.assertEqual(response.status_code, 200)