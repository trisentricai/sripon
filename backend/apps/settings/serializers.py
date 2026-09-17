from rest_framework import serializers

from .models import HomepageSection, SiteSetting
from .services import section_payload


class HomeSectionSerializer(serializers.ModelSerializer):
    payload = serializers.SerializerMethodField()

    class Meta:
        model = HomepageSection
        fields = ["id", "section_type", "title", "subtitle", "content_type", "payload"]

    def get_payload(self, section):
        return section_payload(section)


class HomeSectionAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = HomepageSection
        fields = [
            "id",
            "section_type",
            "title",
            "subtitle",
            "enabled",
            "display_order",
            "content_type",
            "linked_banner",
            "linked_categories",
            "linked_products",
            "max_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        content_type = attrs.get("content_type", getattr(self.instance, "content_type", HomepageSection.ContentType.NONE))
        linked_banner = attrs.get("linked_banner", getattr(self.instance, "linked_banner_id", None))
        if content_type == HomepageSection.ContentType.BANNER and not linked_banner:
            raise serializers.ValidationError(
                {"linked_banner": "Banner content requires a banner."}
            )
        return attrs


class HomeSectionReorderSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField())


class SiteSettingSerializer(serializers.ModelSerializer):
    """Admin key/value store management shape (Phase 12)."""

    class Meta:
        model = SiteSetting
        fields = (
            "id",
            "key",
            "value",
            "group",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_key(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Setting key is required.")
        queryset = SiteSetting.objects.filter(key=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A setting with this key already exists.")
        return value