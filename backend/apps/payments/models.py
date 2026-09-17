import uuid

from django.db import models
from django.utils import timezone

from apps.common.models import TimeStampedModel
from apps.orders.models import Order


class Payment(models.Model):
    """Provider-independent payment record. All amounts are backend-calculated."""

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        INITIATED = "INITIATED", "Initiated"
        SUCCESS = "SUCCESS", "Success"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"
        PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Partially Refunded"

    payment_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="payments",
    )
    provider = models.CharField(max_length=30, default="MOCK")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=8, default="INR")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    provider_ref = models.CharField(max_length=128, blank=True)
    initiation_payload = models.JSONField(default=dict, blank=True)
    webhook_payload = models.JSONField(default=dict, blank=True)
    checksum = models.CharField(max_length=512, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["order"],
                condition=models.Q(status="SUCCESS"),
                name="uniq_success_payment_per_order",
            )
        ]

    def __str__(self):
        return f"{self.payment_id} {self.amount} {self.currency} ({self.status})"

    def mark_success(self, provider_ref: str = ""):
        self.status = self.Status.SUCCESS
        self.provider_ref = provider_ref or self.provider_ref
        self.completed_at = timezone.now()
        self.save(
            update_fields=["status", "provider_ref", "completed_at", "updated_at"]
        )