from django.urls import path

from . import admin_api

urlpatterns = [
    path("", admin_api.BannerAdminCollectionView.as_view(), name="banner-admin-list"),
    path(
        "<int:banner_id>/",
        admin_api.BannerAdminDetailView.as_view(),
        name="banner-admin-detail",
    ),
    path(
        "<int:banner_id>/duplicate/",
        admin_api.BannerDuplicateView.as_view(),
        name="banner-admin-duplicate",
    ),
    path(
        "<int:banner_id>/images/",
        admin_api.BannerImageCollectionView.as_view(),
        name="banner-admin-images",
    ),
    path(
        "<int:banner_id>/images/<str:variant>/",
        admin_api.BannerImageDetailView.as_view(),
        name="banner-admin-image-detail",
    ),
]