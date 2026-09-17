"""Admin notification routing (Phase 14)."""
from django.urls import path

from .api import AdminNotificationSendView

urlpatterns = [
    path("send/", AdminNotificationSendView.as_view(), name="admin-notification-send"),
]