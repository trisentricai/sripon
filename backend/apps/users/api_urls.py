"""URL routing for the authentication domain (Phase 3)."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .api import (
    AddressViewSet,
    AdminAuthView,
    DeviceTokenView,
    FirebaseAuthView,
    GoogleAuthView,
    MeView,
)

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="addresses")

urlpatterns = [
    path("firebase/verify/", FirebaseAuthView.as_view(), name="firebase-verify"),
    path("google/", GoogleAuthView.as_view(), name="google-verify"),
    path("admin/verify/", AdminAuthView.as_view(), name="admin-verify"),
    path("me/", MeView.as_view(), name="me"),
    path("me/device-token/", DeviceTokenView.as_view(), name="device-token"),
    path("", include(router.urls)),
]