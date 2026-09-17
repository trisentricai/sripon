"""Notification serialization for the customer app and admin console."""
from rest_framework import serializers

from .models import Notification, NotificationEventLog


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = (
            "id",
            "title",
            "body",
            "type",
            "payload",
            "read_at",
            "created_at",
        )
        read_only_fields = fields


class UnreadCountSerializer(serializers.Serializer):
    unread = serializers.IntegerField(read_only=True)


class AdminNotificationSendSerializer(serializers.Serializer):
    """Admin promotional/systems notification payload."""

    type = serializers.ChoiceField(choices=Notification.Type.choices)
    title = serializers.CharField(max_length=160)
    body = serializers.CharField(
        max_length=2000, allow_blank=True, required=False
    )
    payload = serializers.JSONField(required=False, default=dict)
    customer_id = serializers.IntegerField(
        required=False, allow_null=True, help_text="Target a single customer."
    )
    push = serializers.BooleanField(
        default=True, help_text="Also send via Firebase Cloud Messaging."
    )

    def validate_customer_id(self, value):
        if value is None:
            return value
        from apps.users.models import UserProfile

        if not UserProfile.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Customer not found.")
        return value


class NotificationEventLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationEventLog
        fields = (
            "id",
            "event",
            "recipient_type",
            "channel",
            "status",
            "error",
            "created_at",
        )
        read_only_fields = fields