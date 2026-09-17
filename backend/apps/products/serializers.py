from rest_framework import serializers

from apps.categories.models import Category

from .models import Inventory, InventoryTransaction, Product, ProductImage


class CategoryMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug")


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = (
            "id",
            "public_id",
            "secure_url",
            "alt_text",
            "width",
            "height",
            "is_primary",
            "sort_order",
        )


def primary_image_payload(product):
    images = list(product.images.all())
    if not images:
        return None
    primary = next((image for image in images if image.is_primary), images[0])
    return {
        "secure_url": primary.secure_url,
        "public_id": primary.public_id,
        "alt_text": primary.alt_text,
    }


class ProductListSerializer(serializers.ModelSerializer):
    category = CategoryMiniSerializer(read_only=True)
    effective_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    discount_percent = serializers.DecimalField(
        max_digits=5, decimal_places=2, read_only=True
    )
    available_quantity = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            "id",
            "name",
            "slug",
            "sku",
            "product_code",
            "brand",
            "short_description",
            "category",
            "mrp",
            "price",
            "discount_price",
            "effective_price",
            "discount_percent",
            "tax",
            "unit",
            "available_quantity",
            "in_stock",
            "is_featured",
            "is_best_seller",
            "is_new",
            "primary_image",
        )

    def get_primary_image(self, obj):
        return primary_image_payload(obj)


class ProductDetailSerializer(ProductListSerializer):
    images = ProductImageSerializer(many=True, read_only=True)

    class Meta(ProductListSerializer.Meta):
        fields = ProductListSerializer.Meta.fields + (
            "description",
            "highlights",
            "specifications",
            "weight",
            "minimum_order_quantity",
            "maximum_order_quantity",
            "meta",
            "images",
            "created_at",
            "updated_at",
        )


class ProductSuggestionSerializer(serializers.ModelSerializer):
    effective_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, read_only=True
    )
    primary_image = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ("id", "name", "slug", "sku", "effective_price", "primary_image")

    def get_primary_image(self, obj):
        return primary_image_payload(obj)


class ProductImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField(required=False)
    alt_text = serializers.CharField(required=False, allow_blank=True, max_length=255)
    is_primary = serializers.BooleanField(required=False, default=False)
    sort_order = serializers.IntegerField(required=False, min_value=0)


class ProductImageReorderItemSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    sort_order = serializers.IntegerField(min_value=0)


class ProductImageReorderSerializer(serializers.Serializer):
    items = ProductImageReorderItemSerializer(many=True, allow_empty=False)


class ProductAdminSerializer(serializers.ModelSerializer):
    """Write shape for admin product create/update (Phase 12)."""

    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Product
        fields = (
            "category",
            "sku",
            "product_code",
            "name",
            "slug",
            "brand",
            "description",
            "short_description",
            "mrp",
            "price",
            "discount_price",
            "tax",
            "stock_quantity",
            "minimum_order_quantity",
            "maximum_order_quantity",
            "weight",
            "unit",
            "specifications",
            "highlights",
            "meta",
            "is_featured",
            "is_best_seller",
            "is_new",
            "is_active",
        )

    def validate_sku(self, value):
        value = (value or "").strip().upper()
        if not value:
            raise serializers.ValidationError("SKU is required.")
        return value

    def validate_slug(self, value):
        value = (value or "").strip().lower()
        return value


class ProductAdminDetailSerializer(ProductDetailSerializer):
    """Read shape for admin product detail (Phase 12).

    Adds operational stock/reserved figures to the public shape.
    """

    class Meta(ProductDetailSerializer.Meta):
        fields = ProductDetailSerializer.Meta.fields + (
            "reserved_quantity",
            "stock_quantity",
            "is_active",
        )


class InventorySerializer(serializers.ModelSerializer):
    """Operational stock view for the admin inventory screen."""

    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    available_quantity = serializers.IntegerField(read_only=True)
    is_low_stock = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Inventory
        fields = (
            "id",
            "product_id",
            "product_name",
            "product_sku",
            "stock_quantity",
            "reserved_quantity",
            "available_quantity",
            "low_stock_threshold",
            "is_low_stock",
            "is_out_of_stock",
            "updated_at",
        )


class InventoryAdjustSerializer(serializers.Serializer):
    quantity_change = serializers.IntegerField()
    reason = serializers.ChoiceField(
        choices=[
            InventoryTransaction.Reason.ADJUSTMENT,
            InventoryTransaction.Reason.PURCHASE,
            InventoryTransaction.Reason.RETURN,
        ],
        default=InventoryTransaction.Reason.ADJUSTMENT,
    )
    reference = serializers.CharField(
        max_length=100, required=False, allow_blank=True
    )

    def validate_quantity_change(self, value):
        if value == 0:
            raise serializers.ValidationError("Quantity change cannot be zero.")
        return value


class InventoryTransactionSerializer(serializers.ModelSerializer):
    admin_name = serializers.CharField(source="admin_user.name", read_only=True)

    class Meta:
        model = InventoryTransaction
        fields = (
            "id",
            "product_id",
            "quantity_change",
            "reason",
            "reference",
            "admin_name",
            "created_at",
        )