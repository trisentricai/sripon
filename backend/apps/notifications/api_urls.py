"""Customer notification routing (Phase 14)."""
from django.urls import path

from .api import (
    NotificationCollectionView,
    NotificationDetailView,
    NotificationUnreadCountView,
)

urlpatterns = [
    path("", NotificationCollectionView.as_view(), name="notifications"),
    path(
        "unread-count/",
        NotificationUnreadCountView.as_view(),
        name="notification-unread-count",
    ),
    path(
        "<int:notification_id>/",
        NotificationDetailView.as_view(),
        name="notification-detail",
    ),
]