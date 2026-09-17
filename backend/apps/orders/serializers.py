from rest_framework import serializers
from django.db.models import Sum

from apps.users.models import Address

from .constants import OrderStatus, PaymentStatus
from .models import Order, OrderItem, OrderStatusHistory


class OrderItemSerializer(serializers.ModelSerializer):
    product = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "name",
            "sku",
            "quantity",
            "unit_price",
            "discount",
            "tax_percent",
            "final_price",
            "line_total",
        )

    def get_product(self, obj):
        if obj.product_id is None:
            return None
        return {
            "id": obj.product_id,
            "slug": obj.product.slug if obj.product else "",
        }


class OrderStatusHistoryEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderStatusHistory
        fields = (
            "from_status",
            "to_status",
            "note",
            "actor_type",
            "actor",
            "created_at",
        )


class OrderSummarySerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "order_status",
            "payment_status",
            "subtotal",
            "discount",
            "tax",
            "delivery_fee",
            "total",
            "item_count",
            "placed_at",
        )

    def get_item_count(self, obj):
        if getattr(obj, "_item_count", None) is not None:
            return obj._item_count
        return obj.items.aggregate(total=Sum("quantity"))["total"] or 0


class OrderDetailSerializer(OrderSummarySerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistoryEntrySerializer(many=True, read_only=True)

    class Meta(OrderSummarySerializer.Meta):
        fields = OrderSummarySerializer.Meta.fields + (
            "customer",
            "address_snapshot",
            "coupon_code",
            "notes",
            "admin_notes",
            "items",
            "status_history",
        )


class CustomerMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    phone = serializers.CharField(read_only=True)


class AdminOrderSummarySerializer(serializers.ModelSerializer):
    customer = CustomerMiniSerializer(read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            "id",
            "order_number",
            "customer",
            "order_status",
            "payment_status",
            "subtotal",
            "discount",
            "tax",
            "delivery_fee",
            "total",
            "item_count",
            "placed_at",
        )

    def get_item_count(self, obj):
        if getattr(obj, "_item_count", None) is not None:
            return obj._item_count
        return obj.items.aggregate(total=Sum("quantity"))["total"] or 0


class AdminOrderDetailSerializer(AdminOrderSummarySerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_history = OrderStatusHistoryEntrySerializer(many=True, read_only=True)

    class Meta(AdminOrderSummarySerializer.Meta):
        fields = AdminOrderSummarySerializer.Meta.fields + (
            "address_snapshot",
            "coupon_code",
            "notes",
            "admin_notes",
            "items",
            "status_history",
        )


class OrderItemsEntrySerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1)


class PlaceOrderSerializer(serializers.Serializer):
    address_id = serializers.IntegerField(min_value=1)
    coupon_code = serializers.CharField(
        max_length=32, allow_blank=True, required=False
    )
    notes = serializers.CharField(max_length=1000, allow_blank=True, required=False)
    items = serializers.ListField(
        child=OrderItemsEntrySerializer(),
        required=False,
        allow_empty=False,
        allow_null=True,
    )


class CancelOrderSerializer(serializers.Serializer):
    pass


class AdminOrderStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=OrderStatus.choices)
    note = serializers.CharField(max_length=255, allow_blank=True, required=False)


class AdminOrderPaymentStatusSerializer(serializers.Serializer):
    payment_status = serializers.ChoiceField(choices=PaymentStatus.choices)
    note = serializers.CharField(max_length=255, allow_blank=True, required=False)


class AddressChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = (
            "id",
            "full_name",
            "phone",
            "address_line_1",
            "address_line_2",
            "city",
            "district",
            "state",
            "pincode",
            "landmark",
        )