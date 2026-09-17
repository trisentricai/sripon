"""Admin category routing (Phase 12)."""
from django.urls import path

from .admin_api import CategoryAdminCollectionView, CategoryAdminDetailView

urlpatterns = [
    path("", CategoryAdminCollectionView.as_view(), name="admin-categories"),
    path(
        "<int:category_id>/",
        CategoryAdminDetailView.as_view(),
        name="admin-category-detail",
    ),
]