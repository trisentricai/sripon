from django.db import models

from apps.common.models import TimeStampedModel
from apps.products.models import Product
from apps.users.models import UserProfile

from .constants import OrderStatus, PaymentStatus


class Order(TimeStampedModel):
    """Customer order with server-computed totals and snapshots."""

    order_number = models.CharField(max_length=32, unique=True)
    customer = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="orders",
    )
    address_snapshot = models.JSONField()
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    coupon_code = models.CharField(max_length=64, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    order_status = models.CharField(
        max_length=20,
        choices=OrderStatus.choices,
        default=OrderStatus.PENDING,
        db_index=True,
    )
    notes = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    placed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-placed_at"]
        indexes = [
            models.Index(fields=["customer", "placed_at"]),
            models.Index(fields=["order_status", "payment_status"]),
        ]

    def __str__(self):
        return self.order_number


class OrderItem(models.Model):
    """Snapshot of a sold product so history never depends on live prices."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(
        Product,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="order_items",
    )
    name = models.CharField(max_length=255)
    sku = models.CharField(max_length=64, blank=True)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    quantity = models.PositiveIntegerField()
    final_price = models.DecimalField(max_digits=12, decimal_places=2)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.sku} x {self.quantity}"


class OrderStatusHistory(models.Model):
    """Immutable timeline of order status changes."""

    class ActorType(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        ADMIN = "ADMIN", "Admin"
        SYSTEM = "SYSTEM", "System"

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    from_status = models.CharField(max_length=20, blank=True)
    to_status = models.CharField(max_length=20)
    note = models.CharField(max_length=255, blank=True)
    actor_type = models.CharField(
        max_length=20,
        choices=ActorType.choices,
        default=ActorType.SYSTEM,
    )
    actor = models.CharField(max_length=128, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.order.order_number}: {self.from_status} -> {self.to_status}"