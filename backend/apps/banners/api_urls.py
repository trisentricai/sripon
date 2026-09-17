from django.urls import path

from . import api

urlpatterns = [
    path("", api.BannerCollectionView.as_view(), name="banner-list"),
    path("<int:banner_id>/", api.BannerDetailView.as_view(), name="banner-detail"),
]