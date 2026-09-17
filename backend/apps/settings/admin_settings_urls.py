"""Admin site-settings routing (Phase 12)."""
from django.urls import path

from .admin_api import SiteSettingCollectionView, SiteSettingDetailView

urlpatterns = [
    path("", SiteSettingCollectionView.as_view(), name="admin-settings"),
    path(
        "<str:key>/",
        SiteSettingDetailView.as_view(),
        name="admin-setting-detail",
    ),
]