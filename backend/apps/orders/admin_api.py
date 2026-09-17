"""Admin order management endpoints (Phase 7)."""
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView

from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsOrderManager
from config.pagination import (
    StandardPagination,
    error_response,
    success_response,
)

from . import services
from .models import Order
from .serializers import (
    AdminOrderDetailSerializer,
    AdminOrderPaymentStatusSerializer,
    AdminOrderStatusSerializer,
    AdminOrderSummarySerializer,
)


class AdminApiView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsOrderManager]


def order_error(exc):
    return error_response(str(exc), {}, status=status.HTTP_400_BAD_REQUEST)


class AdminOrderCollectionView(AdminApiView):
    pagination_class = StandardPagination

    def get(self, request):
        queryset = (
            Order.objects.select_related("customer")
            .annotate(_item_count=Sum("items__quantity", default=0))
            .order_by("-placed_at")
        )
        params = request.query_params

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(order_number__icontains=search)
                | Q(customer__name__icontains=search)
                | Q(customer__phone__icontains=search)
                | Q(customer__email__icontains=search)
            )
        order_status = params.get("status")
        if order_status:
            queryset = queryset.filter(order_status=order_status)
        payment_status = params.get("payment_status")
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        date_from = params.get("from")
        if date_from:
            queryset = queryset.filter(placed_at__date__gte=date_from)
        date_to = params.get("to")
        if date_to:
            queryset = queryset.filter(placed_at__date__lte=date_to)

        pagination = StandardPagination()
        page = pagination.paginate_queryset(queryset, request, view=self)
        return pagination.get_paginated_response(
            AdminOrderSummarySerializer(page, many=True).data
        )


class AdminOrderDetailView(AdminApiView):
    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.select_related("customer").prefetch_related(
                "items", "status_history"
            ),
            pk=pk,
        )
        return success_response(AdminOrderDetailSerializer(order).data)


class AdminOrderStatusView(AdminApiView):
    def patch(self, request, pk):
        serializer = AdminOrderStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_object_or_404(Order, pk=pk)
        try:
            services.transition_order_status(
                order,
                serializer.validated_data["status"],
                note=serializer.validated_data.get("note", ""),
                actor=request.user,
            )
        except services.OrderError as exc:
            return order_error(exc)
        refreshed = (
            Order.objects.select_related("customer")
            .prefetch_related("items", "status_history")
            .get(pk=pk)
        )
        return success_response(
            AdminOrderDetailSerializer(refreshed).data,
            message="Order status updated.",
        )


class AdminOrderPaymentStatusView(AdminApiView):
    def patch(self, request, pk):
        serializer = AdminOrderPaymentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_object_or_404(Order, pk=pk)
        services.update_payment_status(
            order, serializer.validated_data["payment_status"]
        )
        refreshed = Order.objects.select_related("customer").get(pk=pk)
        return success_response(
            AdminOrderDetailSerializer(refreshed).data,
            message="Payment status updated.",
        )