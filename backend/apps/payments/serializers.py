from rest_framework import serializers

from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    initiation = serializers.JSONField(source="initiation_payload", read_only=True)

    class Meta:
        model = Payment
        fields = [
            "payment_id",
            "order_number",
            "provider",
            "amount",
            "currency",
            "status",
            "provider_ref",
            "initiation",
            "created_at",
            "completed_at",
        ]
        read_only_fields = fields


class MockConfirmSerializer(serializers.Serializer):
    payment_id = serializers.UUIDField()