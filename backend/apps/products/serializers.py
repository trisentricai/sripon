from rest_framework import serializers

from apps.categories.models import Category

from .models import Product, ProductImage


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