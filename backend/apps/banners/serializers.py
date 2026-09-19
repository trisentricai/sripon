from rest_framework import serializers

from apps.categories.models import Category
from apps.products.models import Product

from .models import Banner, BannerImage, Poster, PosterImage


class PosterVariantSerializer(serializers.ModelSerializer):
    url = serializers.CharField(source="secure_url", read_only=True)

    class Meta:
        model = PosterImage
        fields = ["variant", "url", "width", "height", "alt_text"]


class PosterAdminSerializer(serializers.ModelSerializer):
    """Admin write/read shape for promotional posters."""

    images = PosterVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Poster
        fields = [
            "id",
            "title",
            "subtitle",
            "cta_text",
            "cta_action",
            "link_product",
            "link_category",
            "custom_url",
            "display_priority",
            "start_date",
            "end_date",
            "active",
            "manager",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "manager", "images", "created_at", "updated_at"]

    def validate(self, attrs):
        action = attrs.get("cta_action", getattr(self.instance, "cta_action", Poster.CtaAction.NONE))
        custom_url = attrs.get("custom_url", getattr(self.instance, "custom_url", ""))
        product = attrs.get("link_product", getattr(self.instance, "link_product", None))
        category = attrs.get("link_category", getattr(self.instance, "link_category", None))

        if action == Poster.CtaAction.URL and not custom_url:
            raise serializers.ValidationError({"custom_url": "Custom URL action requires a URL."})
        if action == Poster.CtaAction.PRODUCT and product is None:
            raise serializers.ValidationError({"link_product": "Product action requires a product."})
        if action == Poster.CtaAction.CATEGORY and category is None:
            raise serializers.ValidationError({"link_category": "Category action requires a category."})

        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        return attrs


class PosterVariantUploadSerializer(serializers.Serializer):
    variant = serializers.ChoiceField(choices=PosterImage.Variant.choices)


class BannerVariantSerializer(serializers.ModelSerializer):
    url = serializers.CharField(source="secure_url", read_only=True)

    class Meta:
        model = BannerImage
        fields = ["variant", "url", "width", "height", "alt_text"]


class BannerCtaSerializer(serializers.Serializer):
    action = serializers.CharField(source="cta_action", read_only=True)
    label = serializers.CharField(source="cta_text", read_only=True)
    product_id = serializers.SerializerMethodField()
    product_slug = serializers.SerializerMethodField()
    category_id = serializers.SerializerMethodField()
    category_slug = serializers.SerializerMethodField()
    url = serializers.CharField(source="custom_url", read_only=True)

    def get_product_id(self, banner):
        return banner.link_product_id

    def get_product_slug(self, banner):
        product = banner.link_product
        return product.slug if product else None

    def get_category_id(self, banner):
        return banner.link_category_id

    def get_category_slug(self, banner):
        category = banner.link_category
        return category.slug if category else None


class BannerSerializer(serializers.ModelSerializer):
    """Public reading shape shared by list and detail responses."""

    cta = BannerCtaSerializer(source="*", read_only=True)
    images = serializers.SerializerMethodField()

    class Meta:
        model = Banner
        fields = [
            "id",
            "title",
            "subtitle",
            "placement",
            "cta",
            "text_alignment",
            "button_visible",
            "overlay_text_enabled",
            "images",
        ]

    def get_images(self, banner):
        variants = banner.images.order_by("id")
        return {item["variant"]: item for item in BannerVariantSerializer(variants, many=True).data}


class BannerAdminSerializer(serializers.ModelSerializer):
    images = BannerVariantSerializer(many=True, read_only=True)

    class Meta:
        model = Banner
        fields = [
            "id",
            "title",
            "subtitle",
            "placement",
            "cta_text",
            "cta_action",
            "link_product",
            "link_category",
            "custom_url",
            "overlay_text_enabled",
            "text_alignment",
            "button_visible",
            "display_priority",
            "start_date",
            "end_date",
            "active",
            "manager",
            "images",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "manager", "images", "created_at", "updated_at"]

    def validate(self, attrs):
        action = attrs.get("cta_action", getattr(self.instance, "cta_action", Banner.CtaAction.NONE))
        custom_url = attrs.get("custom_url", getattr(self.instance, "custom_url", ""))
        product = attrs.get("link_product", getattr(self.instance, "link_product", None))
        category = attrs.get("link_category", getattr(self.instance, "link_category", None))

        if action == Banner.CtaAction.URL and not custom_url:
            raise serializers.ValidationError({"custom_url": "Custom URL action requires a URL."})
        if action == Banner.CtaAction.PRODUCT and product is None:
            raise serializers.ValidationError({"link_product": "Product action requires a product."})
        if action == Banner.CtaAction.CATEGORY and category is None:
            raise serializers.ValidationError({"link_category": "Category action requires a category."})

        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date."}
            )
        return attrs


class BannerVariantUploadSerializer(serializers.Serializer):
    variant = serializers.ChoiceField(choices=BannerImage.Variant.choices)