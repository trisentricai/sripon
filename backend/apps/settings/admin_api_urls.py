from django.urls import path

from . import admin_api

urlpatterns = [
    path("", admin_api.HomeAdminCollectionView.as_view(), name="home-admin-collection"),
    path(
        "reorder/",
        admin_api.HomeAdminReorderView.as_view(),
        name="home-admin-reorder",
    ),
    path(
        "<int:section_id>/",
        admin_api.HomeAdminDetailView.as_view(),
        name="home-admin-detail",
    ),
]