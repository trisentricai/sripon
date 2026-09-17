"""Customer cart routing (Phase 6)."""
from django.urls import path

from .api import (
    CartClearView,
    CartItemCollectionView,
    CartItemDetailView,
    CartMergeView,
    CartView,
)

urlpatterns = [
    path("", CartView.as_view(), name="cart"),
    path("items/", CartItemCollectionView.as_view(), name="cart-items"),
    path("items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("clear/", CartClearView.as_view(), name="cart-clear"),
    path("merge/", CartMergeView.as_view(), name="cart-merge"),
]