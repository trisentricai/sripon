"""Customer wishlist routing (Phase 6)."""
from django.urls import path

from .api import (
    WishlistItemCollectionView,
    WishlistItemDetailView,
    WishlistMoveToCartView,
    WishlistView,
)

urlpatterns = [
    path("", WishlistView.as_view(), name="wishlist"),
    path("items/", WishlistItemCollectionView.as_view(), name="wishlist-items"),
    path(
        "items/<int:product_id>/",
        WishlistItemDetailView.as_view(),
        name="wishlist-item-detail",
    ),
    path(
        "items/<int:product_id>/move-to-cart/",
        WishlistMoveToCartView.as_view(),
        name="wishlist-item-move-to-cart",
    ),
]