"""Public category endpoints, including trees and category-scoped products
(Phase 4)."""
from django.db.models import Count, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound

from apps.products.models import Product
from apps.products.serializers import ProductListSerializer
from config.pagination import StandardPagination, success_response

from .models import Category
from .serializers import (
    CategoryDetailSerializer,
    CategorySerializer,
    CategoryTreeSerializer,
)

PRODUCT_TREE_LIMIT = 100


def build_category_tree(categories):
    """Nest a flat, ordered category list into a parent/child tree."""
    nodes = {category.pk: category for category in categories}
    roots = []
    for category in categories:
        category.tree_children = []
    for category in categories:
        if category.parent_id and category.parent_id in nodes:
            nodes[category.parent_id].tree_children.append(category)
        else:
            roots.append(category)
    return roots


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """Browse the active category catalogue."""

    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    lookup_value_regex = r"\d+"
    pagination_class = StandardPagination

    def get_queryset(self):
        return (
            Category.objects.filter(active=True)
            .select_related("parent")
            .annotate(
                product_count=Count(
                    "products",
                    filter=Q(products__is_active=True),
                )
            )
        )

    def _category_not_found(self):
        raise NotFound("Category not found.")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset().order_by("sort_order", "name")
        if request.query_params.get("tree") in ("true", "1", "yes"):
            tree = build_category_tree(list(queryset))
            return success_response(CategoryTreeSerializer(tree, many=True).data)
        return success_response(CategorySerializer(queryset, many=True).data)

    def retrieve(self, request, *args, **kwargs):
        category = self.get_object()
        return success_response(CategoryDetailSerializer(category).data)

    @action(detail=False, methods=["get"], url_path=r"slug/(?P<slug>[^/.]+)")
    def by_slug(self, request, slug=None):
        category = self.get_queryset().filter(slug=slug).first()
        if category is None:
            self._category_not_found()

        descendant_ids = [category.pk, *category.get_descendant_ids()]
        products = (
            Product.objects.filter(is_active=True, category_id__in=descendant_ids)
            .select_related("category")
            .prefetch_related("images")
            .order_by("-created_at")[:PRODUCT_TREE_LIMIT]
        )
        data = CategoryDetailSerializer(category).data
        data["products"] = ProductListSerializer(products, many=True).data
        return success_response(data)

    @action(detail=True, methods=["get"], url_path="products")
    def products(self, request, pk=None):
        category = self.get_object()
        descendant_ids = [category.pk, *category.get_descendant_ids()]
        queryset = (
            Product.objects.filter(is_active=True, category_id__in=descendant_ids)
            .select_related("category")
            .prefetch_related("images")
            .order_by("-created_at")
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ProductListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = ProductListSerializer(queryset, many=True)
        return success_response(serializer.data)