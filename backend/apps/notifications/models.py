from django.db import models

from apps.common.models import TimeStampedModel
from apps.users.models import UserProfile


class Notification(TimeStampedModel):
    """Customer notification; ``customer=None`` marks a broadcast."""

    class Type(models.TextChoices):
        ORDER = "ORDER", "Order"
        PAYMENT = "PAYMENT", "Payment"
        PROMO = "PROMO", "Promotional"
        SYSTEM = "SYSTEM", "System"

    customer = models.ForeignKey(
        UserProfile,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=160)
    body = models.TextField(blank=True)
    type = models.CharField(
        max_length=20,
        choices=Type.choices,
        default=Type.SYSTEM,
    )
    payload = models.JSONField(default=dict, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["created_at"])]

    def __str__(self):
        return f"{self.type}: {self.title}"


class NotificationEventLog(TimeStampedModel):
    """Tracks dispatch of a notification attempt (email/FCM/in-app)."""

    class RecipientType(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        ADMIN = "ADMIN", "Admin"
        BROADCAST = "BROADCAST", "Broadcast"

    class Channel(models.TextChoices):
        EMAIL = "EMAIL", "Email"
        FCM = "FCM", "Firebase Cloud Messaging"
        IN_APP = "IN_APP", "In-app"

    event = models.CharField(max_length=40)
    recipient_type = models.CharField(
        max_length=20,
        choices=RecipientType.choices,
        default=RecipientType.CUSTOMER,
    )
    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.IN_APP,
    )
    status = models.CharField(max_length=20, default="PENDING")
    error = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event} -> {self.channel} ({self.status})"