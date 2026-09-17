"""Customer coupon validation routing (Phase 7)."""
from django.urls import path

from .api import CouponValidateView

urlpatterns = [
    path("validate/", CouponValidateView.as_view(), name="coupon-validate"),
]