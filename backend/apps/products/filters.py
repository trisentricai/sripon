import django_filters
from django.db.models import F, Q
from django.db.models.functions import Coalesce, Least


def effective_price_expression():
    """Cheapest sellable price: min(discount_price or price, price)."""
    return Least(Coalesce("discount_price", "price"), "price")


class ProductFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_search")
    category = django_filters.NumberFilter(field_name="category_id")
    category__in = django_filters.BaseInFilter(
        field_name="category_id", lookup_expr="in"
    )
    min_price = django_filters.NumberFilter(method="filter_min_price")
    max_price = django_filters.NumberFilter(method="filter_max_price")
    availability = django_filters.ChoiceFilter(
        choices=(
            ("in_stock", "In stock"),
            ("out_of_stock", "Out of stock"),
        ),
        method="filter_availability",
    )
    discounted = django_filters.BooleanFilter(method="filter_discounted")
    featured = django_filters.BooleanFilter(field_name="is_featured")
    best_seller = django_filters.BooleanFilter(field_name="is_best_seller")
    new = django_filters.BooleanFilter(field_name="is_new")
    brand = django_filters.CharFilter(field_name="brand", lookup_expr="iexact")
    unit = django_filters.CharFilter(field_name="unit", lookup_expr="iexact")

    def filter_search(self, queryset, name, value):
        value = value.strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(name__icontains=value)
            | Q(sku__icontains=value)
            | Q(product_code__icontains=value)
        )

    def filter_min_price(self, queryset, name, value):
        return queryset.filter(effective_price_calc__gte=value)

    def filter_max_price(self, queryset, name, value):
        return queryset.filter(effective_price_calc__lte=value)

    def filter_availability(self, queryset, name, value):
        if value == "in_stock":
            return queryset.filter(stock_quantity__gt=F("reserved_quantity"))
        if value == "out_of_stock":
            return queryset.filter(stock_quantity__lte=F("reserved_quantity"))
        return queryset

    def filter_discounted(self, queryset, name, value):
        if value is None:
            return queryset
        discounted = queryset.filter(
            discount_price__isnull=False,
            discount_price__lt=F("price"),
        )
        return discounted if value else queryset.exclude(
            pk__in=discounted.values("pk")
        )