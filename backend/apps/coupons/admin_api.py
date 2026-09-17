"""Admin coupon CRUD (Phase 12)."""
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView

from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsCouponManager
from config.pagination import success_response

from .models import Coupon
from .serializers import CouponAdminSerializer


def _with_counts():
    return Coupon.objects.annotate(usage_count=Count("usages"))


class CouponAdminCollectionView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsCouponManager]

    def get(self, request):
        queryset = _with_counts().order_by("-created_at")
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(code__icontains=search)
        active = request.query_params.get("active")
        if active in ("true", "false"):
            queryset = queryset.filter(active=active == "true")
        return success_response(CouponAdminSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = CouponAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        coupon = serializer.save()
        return success_response(
            CouponAdminSerializer(coupon).data,
            message="Coupon created.",
            status=status.HTTP_201_CREATED,
        )


class CouponAdminDetailView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsCouponManager]

    def get(self, request, coupon_id):
        coupon = get_object_or_404(_with_counts(), pk=coupon_id)
        return success_response(CouponAdminSerializer(coupon).data)

    def patch(self, request, coupon_id):
        coupon = get_object_or_404(Coupon, pk=coupon_id)
        serializer = CouponAdminSerializer(coupon, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        coupon = serializer.save()
        return success_response(
            CouponAdminSerializer(coupon).data, message="Coupon updated."
        )

    def delete(self, request, coupon_id):
        coupon = get_object_or_404(Coupon, pk=coupon_id)
        if coupon.usages.exists():
            coupon.active = False
            coupon.save(update_fields=["active", "updated_at"])
            return success_response(
                None,
                message="Coupon has redemptions; it was deactivated instead.",
            )
        coupon.delete()
        return success_response(None, message="Coupon deleted.")