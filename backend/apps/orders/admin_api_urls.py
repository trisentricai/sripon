"""Admin order routing (Phase 7)."""
from django.urls import path

from .admin_api import (
    AdminOrderCollectionView,
    AdminOrderDetailView,
    AdminOrderPaymentStatusView,
    AdminOrderStatusView,
)

urlpatterns = [
    path("", AdminOrderCollectionView.as_view(), name="admin-orders"),
    path(
        "<int:pk>/",
        AdminOrderDetailView.as_view(),
        name="admin-order-detail",
    ),
    path(
        "<int:pk>/status/",
        AdminOrderStatusView.as_view(),
        name="admin-order-status",
    ),
    path(
        "<int:pk>/payment-status/",
        AdminOrderPaymentStatusView.as_view(),
        name="admin-order-payment-status",
    ),
]