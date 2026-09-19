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
    # Customer cart & wishlist (Phase 6)
    path("cart/", include("apps.cart.api_urls")),
    path("wishlist/", include("apps.cart.wishlist_api_urls")),
    # Customer coupon validation (Phase 7)
    path("coupons/", include("apps.coupons.api_urls")),
    # Checkout & orders (Phase 7)
    path("orders/", include("apps.orders.api_urls")),
    path("admin/orders/", include("apps.orders.admin_api_urls")),
    # Payments (Phase 8)
    path("payments/", include("apps.payments.api_urls")),
    # Banners & posters (Phase 9)
    path("banners/", include("apps.banners.api_urls")),
    path("admin/banners/", include("apps.banners.admin_api_urls")),
    path("admin/posters/", include("apps.banners.poster_api_urls")),
    # Homepage CMS (Phase 10)
    path("home/", include("apps.settings.api_urls")),
    path("admin/home/", include("apps.settings.admin_api_urls")),
    # Admin catalogue management (Phase 12)
    path("admin/inventory/", include("apps.products.inventory_api_urls")),
    path("admin/categories/", include("apps.categories.admin_api_urls")),
    path("admin/coupons/", include("apps.coupons.admin_api_urls")),
    path("admin/settings/", include("apps.settings.admin_settings_urls")),
    # Admin dashboard, analytics, customers & admin users (Phase 12)
    path("admin/", include("apps.analytics.urls")),
    path("admin/", include("apps.users.admin_api_urls")),
    # Notifications (Phase 14)
    path("notifications/", include("apps.notifications.api_urls")),
    path("admin/notifications/", include("apps.notifications.admin_api_urls")),
]