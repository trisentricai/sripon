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