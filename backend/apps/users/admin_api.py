"""Admin customer and admin-user management (Phase 12).

Customers are read-mostly (the identity provider owns them); admins may be
listed, created, re-roled, disabled and removed by a SUPER_ADMIN.
"""
from decimal import Decimal

from django.db.models import Count, DecimalField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.orders.serializers import AdminOrderSummarySerializer
from config.pagination import (
    StandardPagination,
    error_response,
    success_response,
)

from .api import ADMIN_AUTH
from .authentication import IsManager, IsSuperAdmin
from .models import Address, AdminUser, UserProfile
from .serializers import (
    AddressSerializer,
    AdminUserSerializer,
    CustomerAdminSerializer,
)

PAID_STATUSES = ["PAID", "PARTIALLY_REFUNDED"]


def _customers():
    return UserProfile.objects.annotate(
        order_count=Count("orders", distinct=True),
        total_spent=Coalesce(
            Sum("orders__total", filter=Q(orders__payment_status__in=PAID_STATUSES)),
            Value(Decimal("0")),
            output_field=DecimalField(max_digits=12, decimal_places=2),
        ),
    )


class CustomerAdminCollectionView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsManager]
    pagination_class = StandardPagination

    def get(self, request):
        queryset = _customers().order_by("-created_at")
        params = request.query_params
        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )
        active = params.get("active")
        if active in ("true", "false"):
            queryset = queryset.filter(active=active == "true")

        pagination = StandardPagination()
        page = pagination.paginate_queryset(queryset, request, view=self)
        return pagination.get_paginated_response(
            CustomerAdminSerializer(page, many=True).data
        )


class CustomerAdminDetailView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsManager]

    def get(self, request, customer_id):
        customer = get_object_or_404(_customers(), pk=customer_id)
        orders = (
            Order.objects.filter(customer=customer)
            .order_by("-placed_at")[:10]
        )
        addresses = Address.objects.filter(customer=customer)
        data = CustomerAdminSerializer(customer).data
        data["recent_orders"] = AdminOrderSummarySerializer(orders, many=True).data
        data["addresses"] = AddressSerializer(addresses, many=True).data
        return success_response(data)

    def patch(self, request, customer_id):
        customer = get_object_or_404(UserProfile, pk=customer_id)
        if "active" in request.data:
            customer.active = bool(request.data["active"])
            customer.save(update_fields=["active", "updated_at"])
        return success_response(
            CustomerAdminSerializer(customer).data, message="Customer updated."
        )


class AdminUserCollectionView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsSuperAdmin]

    def get(self, request):
        queryset = AdminUser.objects.all().order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(email__icontains=search)
            )
        role = request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)
        return success_response(AdminUserSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = AdminUserSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if not data.get("supabase_uid"):
            return error_response(
                "A Supabase UID is required to link an admin identity.",
                {"supabase_uid": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        admin = serializer.save()
        return success_response(
            AdminUserSerializer(admin).data,
            message="Admin user created.",
            status=status.HTTP_201_CREATED,
        )


class AdminUserDetailView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsSuperAdmin]

    def get(self, request, admin_id):
        admin = get_object_or_404(AdminUser, pk=admin_id)
        return success_response(AdminUserSerializer(admin).data)

    def patch(self, request, admin_id):
        admin = get_object_or_404(AdminUser, pk=admin_id)
        serializer = AdminUserSerializer(admin, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        admin = serializer.save()
        return success_response(
            AdminUserSerializer(admin).data, message="Admin user updated."
        )

    def delete(self, request, admin_id):
        admin = get_object_or_404(AdminUser, pk=admin_id)
        if admin.pk == getattr(request.user, "pk", None):
            return error_response(
                "You cannot deactivate your own account.",
                {},
                status=status.HTTP_400_BAD_REQUEST,
            )
        admin.active = False
        admin.save(update_fields=["active", "updated_at"])
        return success_response(None, message="Admin user deactivated.")