"""Admin customer and admin-user routing (Phase 12)."""
from django.urls import path

from .admin_api import (
    AdminUserCollectionView,
    AdminUserDetailView,
    CustomerAdminCollectionView,
    CustomerAdminDetailView,
)

urlpatterns = [
    path(
        "customers/",
        CustomerAdminCollectionView.as_view(),
        name="admin-customers",
    ),
    path(
        "customers/<int:customer_id>/",
        CustomerAdminDetailView.as_view(),
        name="admin-customer-detail",
    ),
    path(
        "admin-users/",
        AdminUserCollectionView.as_view(),
        name="admin-users",
    ),
    path(
        "admin-users/<int:admin_id>/",
        AdminUserDetailView.as_view(),
        name="admin-user-detail",
    ),
]