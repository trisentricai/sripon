"""Public product catalogue endpoints (Phase 4)."""
from decimal import Decimal

from django.db.models import F, Sum, Value
from django.db.models.functions import Greatest
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound

from config.pagination import StandardPagination, success_response

from .filters import ProductFilter, effective_price_expression
from .models import Product
from .serializers import (
    ProductDetailSerializer,
    ProductListSerializer,
    ProductSuggestionSerializer,
)

ORDERING_MAP = {
    "price": "effective_price_calc",
    "-price": "-effective_price_calc",
    "newest": "-created_at",
    "name": "name",
    "-name": "-name",
}


class ProductViewSet(viewsets.ReadOnlyModelViewSet):
    """Browse, search, filter and sort the active product catalogue."""

    permission_classes = [permissions.AllowAny]
    pagination_class = StandardPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = ProductFilter
    lookup_value_regex = r"\d+"

    def get_queryset(self):
        return (
            Product.objects.filter(is_active=True)
            .select_related("category")
            .prefetch_related("images")
            .annotate(effective_price_calc=effective_price_expression())
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProductDetailSerializer
        if self.action == "suggestions":
            return ProductSuggestionSerializer
        return ProductListSerializer

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        return self._apply_ordering(queryset)

    def _apply_ordering(self, queryset):
        ordering = self.request.query_params.get("ordering", "-created_at")

        if ordering == "popularity":
            return queryset.annotate(
                sold_count=Sum("order_items__quantity", default=0)
            ).order_by("-sold_count", "-created_at")
        if ordering in ("discount", "-discount"):
            discount = Greatest(
                F("mrp") - F("effective_price_calc"),
                Value(Decimal("0")),
            )
            queryset = queryset.annotate(discount_amount_calc=discount)
            return queryset.order_by("-discount_amount_calc", "-created_at")

        field = ORDERING_MAP.get(ordering)
        if field is None:
            field = "-created_at"
        return queryset.order_by(field)

    def _paginated(self, queryset, serializer_class=None):
        page = self.paginate_queryset(queryset)
        serializer_class = serializer_class or self.get_serializer_class()
        if page is not None:
            serializer = serializer_class(page, many=True, context=self.get_serializer_context())
            return self.get_paginated_response(serializer.data)
        serializer = serializer_class(queryset, many=True, context=self.get_serializer_context())
        return success_response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        product = self.get_object()
        return success_response(ProductDetailSerializer(product).data)

    @action(detail=False, methods=["get"], url_path=r"slug/(?P<slug>[^/.]+)")
    def by_slug(self, request, slug=None):
        product = self.get_queryset().filter(slug=slug).first()
        if product is None:
            raise NotFound("Product not found.")
        return success_response(ProductDetailSerializer(product).data)

    @action(detail=False, methods=["get"], url_path="best-sellers")
    def best_sellers(self, request):
        queryset = self.filter_queryset(self.get_queryset().filter(is_best_seller=True))
        return self._paginated(queryset)

    @action(detail=False, methods=["get"], url_path="new-arrivals")
    def new_arrivals(self, request):
        queryset = self.filter_queryset(self.get_queryset().filter(is_new=True))
        return self._paginated(queryset)

    @action(detail=False, methods=["get"], url_path="suggestions")
    def suggestions(self, request):
        term = (request.query_params.get("q") or "").strip()
        if len(term) < 2:
            return success_response([])
        queryset = (
            self.get_queryset()
            .filter(name__icontains=term)
            .order_by("-is_featured", "name")[:10]
        )
        serializer = ProductSuggestionSerializer(queryset, many=True)
        return success_response(serializer.data)