from rest_framework import serializers

from .models import Category


class CategorySerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "image",
            "banner",
            "parent",
            "sort_order",
            "product_count",
        )


class CategoryTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "image",
            "parent",
            "sort_order",
            "product_count",
            "children",
        )

    def get_children(self, obj):
        children = getattr(obj, "tree_children", None)
        if children is None:
            children = [c for c in obj.children.all() if c.active]
        return CategoryTreeSerializer(children, many=True).data


class CategoryDetailSerializer(CategorySerializer):
    class Meta(CategorySerializer.Meta):
        fields = CategorySerializer.Meta.fields + ("created_at", "updated_at")


class CategoryAdminSerializer(serializers.ModelSerializer):
    """Write shape for admin category management (Phase 12)."""

    parent = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        required=False,
        allow_null=True,
        default=None,
    )
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "slug",
            "description",
            "image",
            "banner",
            "parent",
            "sort_order",
            "active",
            "product_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_parent(self, value):
        if value is not None and self.instance is not None and value.pk == self.instance.pk:
            raise serializers.ValidationError("A category cannot be its own parent.")
        return value