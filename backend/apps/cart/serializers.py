from rest_framework import serializers

from apps.products.serializers import primary_image_payload

from .models import CartItem, WishlistItem
from .services import item_line


class CartProductSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(read_only=True)
    slug = serializers.SlugField(read_only=True)
    sku = serializers.CharField(read_only=True)
    unit = serializers.CharField(read_only=True)
    price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    mrp = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    discount_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    effective_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )
    available_quantity = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    minimum_order_quantity = serializers.IntegerField(read_only=True)
    maximum_order_quantity = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    primary_image = serializers.SerializerMethodField()

    def get_primary_image(self, obj):
        return primary_image_payload(obj)


class CartItemSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)
    unit_price = serializers.SerializerMethodField()
    line_total = serializers.SerializerMethodField()
    mrp_line_total = serializers.SerializerMethodField()
    tax_total = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product",
            "quantity",
            "unit_price",
            "line_total",
            "mrp_line_total",
            "tax_total",
            "is_available",
            "added_at",
        )

    def get_unit_price(self, obj):
        return obj.product.effective_price

    def get_line_total(self, obj):
        return item_line(obj)["line_total"]

    def get_mrp_line_total(self, obj):
        return item_line(obj)["mrp_line_total"]

    def get_tax_total(self, obj):
        return item_line(obj)["tax_total"]

    def get_is_available(self, obj):
        return obj.product.is_active and obj.product.available_quantity >= obj.quantity


class CartSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    item_count = serializers.SerializerMethodField()
    line_count = serializers.SerializerMethodField()
    items = CartItemSerializer(source="items.all", many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    mrp_total = serializers.SerializerMethodField()
    discount_total = serializers.SerializerMethodField()
    tax_total = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    updated_at = serializers.DateTimeField(read_only=True)

    def _summary(self):
        from .services import cart_summary

        if not hasattr(self, "_cached_summary"):
            self._cached_summary = cart_summary(self.instance)
        return self._cached_summary

    def get_item_count(self, obj):
        return self._summary()["item_count"]

    def get_line_count(self, obj):
        return self._summary()["line_count"]

    def get_subtotal(self, obj):
        return self._summary()["subtotal"]

    def get_mrp_total(self, obj):
        return self._summary()["mrp_total"]

    def get_discount_total(self, obj):
        return self._summary()["discount_total"]

    def get_tax_total(self, obj):
        return self._summary()["tax_total"]

    def get_total(self, obj):
        return self._summary()["total"]

    def get_currency(self, obj):
        return self._summary()["currency"]


class AddCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=0)


class MergeCartItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, default=1)


class MergeCartSerializer(serializers.Serializer):
    items = MergeCartItemSerializer(many=True, allow_empty=True)


class WishlistItemSerializer(serializers.ModelSerializer):
    product = CartProductSerializer(read_only=True)

    class Meta:
        model = WishlistItem
        fields = ("id", "product", "added_at")


class WishlistSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    item_count = serializers.SerializerMethodField()
    items = WishlistItemSerializer(source="items.all", many=True, read_only=True)
    updated_at = serializers.DateTimeField(read_only=True)

    def get_item_count(self, obj):
        return obj.items.count()


class MoveToCartSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, default=1)
