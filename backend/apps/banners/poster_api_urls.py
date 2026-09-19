"""Admin poster routing (dedicated posters feature)."""
from django.urls import path

from .poster_api import (
    PosterCollectionView,
    PosterDetailView,
    PosterImageCollectionView,
    PosterImageDetailView,
)

urlpatterns = [
    path("", PosterCollectionView.as_view(), name="poster-admin-list"),
    path(
        "<int:poster_id>/",
        PosterDetailView.as_view(),
        name="poster-admin-detail",
    ),
    path(
        "<int:poster_id>/images/",
        PosterImageCollectionView.as_view(),
        name="poster-admin-images",
    ),
    path(
        "<int:poster_id>/images/<str:variant>/",
        PosterImageDetailView.as_view(),
        name="poster-admin-image-detail",
    ),
]