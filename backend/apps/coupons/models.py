from django.db import models

from apps.common.models import TimeStampedModel
from apps.orders.models import Order
from apps.users.models import UserProfile


class Coupon(TimeStampedModel):
    """Discount coupon validated and redeemed exclusively by the backend."""

    class DiscountType(models.TextChoices):
        PERCENTAGE = "PERCENTAGE", "Percentage"
        FIXED_AMOUNT = "FIXED_AMOUNT", "Fixed Amount"

    code = models.CharField(max_length=32, unique=True)
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        default=DiscountType.PERCENTAGE,
    )
    discount_value = models.DecimalField(max_digits=12, decimal_places=2)
    minimum_order_value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    maximum_discount = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    start_date = models.DateTimeField()
    expiry_date = models.DateTimeField()
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    per_customer_limit = models.PositiveIntegerField(default=1)
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.code

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)


class CouponUsage(TimeStampedModel):
    """One redeemable unit of coupon application against an order."""

    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name="usages")
    customer = models.ForeignKey(
        UserProfile,
        on_delete=models.CASCADE,
        related_name="coupon_usages",
    )
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="coupon_usages",
    )
    applied_discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["coupon", "customer", "order"],
                name="uniq_coupon_customer_order",
            )
        ]

    def __str__(self):
        return f"{self.coupon.code} by {self.customer}"