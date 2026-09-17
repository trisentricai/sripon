"""Customer checkout and order endpoints (Phase 7)."""
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView

from apps.users.api import CUSTOMER_AUTH
from apps.users.authentication import IsCustomer
from apps.users.models import Address
from config.pagination import (
    StandardPagination,
    error_response,
    success_response,
)

from . import services
from .models import Order
from .serializers import (
    CancelOrderSerializer,
    OrderDetailSerializer,
    OrderSummarySerializer,
    PlaceOrderSerializer,
)


class CustomerApiView(APIView):
    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]


def order_error(exc):
    return error_response(str(exc), {}, status=status.HTTP_400_BAD_REQUEST)


class OrderCollectionView(CustomerApiView):
    pagination_class = StandardPagination

    def get(self, request):
        queryset = (
            Order.objects.filter(customer=request.user)
            .annotate(_item_count=Sum("items__quantity", default=0))
            .order_by("-placed_at")
        )
        order_status = request.query_params.get("status")
        if order_status:
            queryset = queryset.filter(order_status=order_status)
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(order_number__icontains=search)

        pagination = StandardPagination()
        page = pagination.paginate_queryset(queryset, request, view=self)
        return pagination.get_paginated_response(
            OrderSummarySerializer(page, many=True).data
        )

    def post(self, request):
        serializer = PlaceOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        address = Address.objects.filter(
            pk=data["address_id"], customer=request.user
        ).first()
        if address is None:
            return error_response(
                "Address not found.", {}, status=status.HTTP_404_NOT_FOUND
            )

        try:
            order = services.place_order(
                request.user,
                address,
                coupon_code=data.get("coupon_code", ""),
                items=data.get("items"),
                notes=data.get("notes", ""),
            )
        except services.OrderError as exc:
            return order_error(exc)

        return success_response(
            OrderDetailSerializer(order).data,
            message="Order placed.",
            status=status.HTTP_201_CREATED,
        )


class OrderDetailView(CustomerApiView):
    def get(self, request, pk):
        order = get_object_or_404(
            Order.objects.prefetch_related("items", "status_history"),
            pk=pk,
            customer=request.user,
        )
        return success_response(OrderDetailSerializer(order).data)


class OrderCancelView(CustomerApiView):
    def post(self, request, pk):
        CancelOrderSerializer(data=request.data).is_valid(raise_exception=True)
        order = get_object_or_404(
            Order.objects.prefetch_related("items"),
            pk=pk,
            customer=request.user,
        )
        try:
            services.cancel_order(order)
        except services.OrderError as exc:
            return order_error(exc)

        refreshed = (
            Order.objects.prefetch_related("items", "status_history").get(pk=pk)
        )
        return success_response(
            OrderDetailSerializer(refreshed).data, message="Order cancelled."
        )