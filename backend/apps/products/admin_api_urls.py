"""Admin media routing (Phase 5) + product CRUD (Phase 12)."""
from django.urls import path

from .admin_api import (
    AdminProductCollectionView,
    AdminProductDetailView,
    ProductImageCollectionView,
    ProductImageDetailView,
    ProductImagePrimaryView,
    ProductImageReorderView,
)

urlpatterns = [
    path("", AdminProductCollectionView.as_view(), name="admin-products"),
    path(
        "<int:product_id>/",
        AdminProductDetailView.as_view(),
        name="admin-product-detail",
    ),
    path(
        "<int:product_id>/images/",
        ProductImageCollectionView.as_view(),
        name="admin-product-images",
    ),
    path(
        "<int:product_id>/images/reorder/",
        ProductImageReorderView.as_view(),
        name="admin-product-images-reorder",
    ),
    path(
        "<int:product_id>/images/<int:image_id>/",
        ProductImageDetailView.as_view(),
        name="admin-product-image-detail",
    ),
    path(
        "<int:product_id>/images/<int:image_id>/primary/",
        ProductImagePrimaryView.as_view(),
        name="admin-product-image-primary",
    ),
]