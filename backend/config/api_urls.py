"""Versioned API URL router.

Every application registers its URL patterns here as its domain is built
(PHASE 2 onwards). Root-level, cross-domain routes (auth/me, coupons/validate,
admin/dashboard) also land here.
"""
from django.urls import include, path

app_name = "v1"

urlpatterns = [
    # Auth (Phase 3)
    path("auth/", include("apps.users.api_urls")),
    # Public catalogue (Phase 4)
    path("products/", include("apps.products.api_urls")),
    path("categories/", include("apps.categories.api_urls")),
    # Admin media, product images (Phase 5)
    path("admin/products/", include("apps.products.admin_api_urls")),
    # Cross-domain and admin endpoints appear here as phases ship:
    # path("banners/", include("apps.banners.api_urls")),
    # path("cart/", include("apps.cart.api_urls")),
    # path("orders/", include("apps.orders.api_urls")),
    # path("coupons/", include("apps.coupons.api_urls")),
    # path("payments/", include("apps.payments.api_urls")),
    # path("home/", include("apps.settings.api_urls")),
    # path("admin/", include("apps.settings.admin_api_urls")),
]