"""Admin inventory routing (Phase 12)."""
from django.urls import path

from .admin_api import AdminInventoryCollectionView, AdminInventoryDetailView

urlpatterns = [
    path("", AdminInventoryCollectionView.as_view(), name="admin-inventory"),
    path(
        "<int:product_id>/",
        AdminInventoryDetailView.as_view(),
        name="admin-inventory-detail",
    ),
]