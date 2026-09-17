"""Admin coupon routing (Phase 12)."""
from django.urls import path

from .admin_api import CouponAdminCollectionView, CouponAdminDetailView

urlpatterns = [
    path("", CouponAdminCollectionView.as_view(), name="admin-coupons"),
    path(
        "<int:coupon_id>/",
        CouponAdminDetailView.as_view(),
        name="admin-coupon-detail",
    ),
]