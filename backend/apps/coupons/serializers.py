from rest_framework import serializers

from .models import Coupon


class CouponAdminSerializer(serializers.ModelSerializer):
    """Write shape for admin coupon management (Phase 12)."""

    usage_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Coupon
        fields = (
            "id",
            "code",
            "discount_type",
            "discount_value",
            "minimum_order_value",
            "maximum_discount",
            "start_date",
            "expiry_date",
            "usage_limit",
            "per_customer_limit",
            "active",
            "usage_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "usage_count", "created_at", "updated_at")

    def validate_code(self, value):
        value = (value or "").strip().upper()
        if not value:
            raise serializers.ValidationError("Coupon code is required.")
        queryset = Coupon.objects.filter(code=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A coupon with this code already exists.")
        return value

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        expiry = attrs.get("expiry_date", getattr(self.instance, "expiry_date", None))
        if start and expiry and start >= expiry:
            raise serializers.ValidationError(
                {"expiry_date": "Expiry date must be after the start date."}
            )
        discount_type = attrs.get(
            "discount_type", getattr(self.instance, "discount_type", None)
        )
        discount_value = attrs.get(
            "discount_value", getattr(self.instance, "discount_value", None)
        )
        if (
            discount_type == Coupon.DiscountType.PERCENTAGE
            and discount_value is not None
            and discount_value > 100
        ):
            raise serializers.ValidationError(
                {"discount_value": "Percentage discount cannot exceed 100."}
            )
        return attrs