"""Root URL configuration for SriPon."""
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path, re_path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from config.views import admin_portal


def health_check(_request):
    """Liveness probe used by Render."""
    return JsonResponse({"status": "ok", "service": "sripon-api"})


urlpatterns = [
    path("", health_check, name="health"),
    path("health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),
    # Baked admin dashboard SPA (built from admin/ via Vite).
    re_path(r"^admin-portal/(?P<path>.*)$", admin_portal),
    path("admin-portal", admin_portal),
    # OpenAPI schema + interactive docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="docs",
    ),
    path(
        "api/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
    # Versioned REST API
    path("api/v1/", include("config.api_urls")),
]