"""Homepage CMS helpers (Phase 10).

A section carries links (product/category/banner) chosen by the content team.
Product-ish sections fall back to smart queries (best sellers / new arrivals)
when the curators have not pinned items yet.
"""
from django.db import transaction
from django.db.models import Sum

from apps.banners.serializers import BannerSerializer
from apps.categories.serializers import CategorySerializer
from apps.categories.models import Category
from apps.products.models import Product
from apps.products.serializers import ProductListSerializer

from .models import HomepageSection

# Section types that present a curated OR computed product rail.
_PRODUCT_TYPES = {
    HomepageSection.SectionType.FEATURED,
    HomepageSection.SectionType.BEST_SELLERS,
    HomepageSection.SectionType.NEW_ARRIVALS,
    HomepageSection.SectionType.OFFERS,
    HomepageSection.SectionType.CUSTOM_COLLECTION,
}


def section_payload(section: HomepageSection):
    """Return a serializable ``[{...}, ...]`` payload. Resolving happens here
    so the public endpoint never exposes internal link management."""
    max_items = section.max_items or 12

    if section.content_type == HomepageSection.ContentType.PRODUCTS:
        return _products_payload(section, max_items)

    if section.content_type == HomepageSection.ContentType.CATEGORIES:
        queryset = section.linked_categories.all()
        if not queryset.exists():
            queryset = Category.objects.filter(active=True)
        return CategorySerializer(queryset[:max_items], many=True).data

    if section.content_type == HomepageSection.ContentType.BANNER:
        if section.linked_banner_id:
            return BannerSerializer(section.linked_banner).data
        return None

    if section.section_type in _PRODUCT_TYPES:
        return _products_payload(section, max_items)

    return None


def _products_payload(section: HomepageSection, max_items: int):
    base = Product.objects.prefetch_related("images")
    explicit = section.linked_products.all()
    if explicit.exists():
        queryset = explicit[:max_items]
    elif section.section_type == HomepageSection.SectionType.BEST_SELLERS:
        queryset = (
            base.filter(is_active=True)
            .annotate(sold_count=Sum("order_items__quantity", default=0))
            .order_by("-sold_count", "-created_at")[:max_items]
        )
    elif section.section_type == HomepageSection.SectionType.NEW_ARRIVALS:
        queryset = base.filter(is_active=True).order_by("-created_at")[:max_items]
    else:
        queryset = base.filter(is_active=True, is_featured=True)[:max_items]
    return ProductListSerializer(queryset, many=True).data


def reorder_sections(ids) -> None:
    """Apply display_order sequentially for the given section ids."""
    from .models import HomepageSection as Section

    with transaction.atomic():
        for index, section_id in enumerate(ids):
            Section.objects.filter(pk=section_id).update(display_order=index)