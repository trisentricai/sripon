"""Versioned API URL router.

Every application registers its URL patterns here as its domain is built
(PHASE 2 onwards). Root-level, cross-domain routes (auth/me, coupons/validate,
admin/dashboard) also land here.
"""
from django.urls import include, path

app_name = "v1"

urlpatterns = [
    # Cross-domain and admin endpoints appear here as phases ship:
    # path("auth/", include("apps.users.api_urls")),
    # path("products/", include("apps.products.api_urls")),
    # path("categories/", include("apps.categories.api_urls")),
    # path("banners/", include("apps.banners.api_urls")),
    # path("cart/", include("apps.cart.api_urls")),
    # path("orders/", include("apps.orders.api_urls")),
    # path("coupons/", include("apps.coupons.api_urls")),
    # path("payments/", include("apps.payments.api_urls")),
    # path("home/", include("apps.settings.api_urls")),
    # path("admin/", include("apps.settings.admin_api_urls")),
]