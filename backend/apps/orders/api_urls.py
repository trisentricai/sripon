"""Customer order routing (Phase 7)."""
from django.urls import path

from .api import OrderCancelView, OrderCollectionView, OrderDetailView

urlpatterns = [
    path("", OrderCollectionView.as_view(), name="orders"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
]