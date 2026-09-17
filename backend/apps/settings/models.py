from django.db import models

from apps.banners.models import Banner
from apps.categories.models import Category
from apps.common.models import TimeStampedModel
from apps.products.models import Product


class SiteSetting(TimeStampedModel):
    """Key/value store for store configuration (delivery, tax, legal text)."""

    class Group(models.TextChoices):
        GENERAL = "GENERAL", "General"
        SHOPPING = "SHOPPING", "Shopping"
        LEGAL = "LEGAL", "Legal"
        SOCIAL = "SOCIAL", "Social"
        PAYMENT = "PAYMENT", "Payment"

    key = models.CharField(max_length=100, unique=True)
    value = models.JSONField(default=dict)
    group = models.CharField(
        max_length=40,
        choices=Group.choices,
        default=Group.GENERAL,
        db_index=True,
    )

    def __str__(self):
        return self.key


class HomepageSection(TimeStampedModel):
    """CMS-driven block rendered by the customer website and mobile app."""

    class SectionType(models.TextChoices):
        HERO = "HERO", "Hero Banner"
        CATEGORIES = "CATEGORIES", "Categories"
        FEATURED = "FEATURED", "Featured Products"
        BEST_SELLERS = "BEST_SELLERS", "Best Sellers"
        NEW_ARRIVALS = "NEW_ARRIVALS", "New Arrivals"
        OFFERS = "OFFERS", "Offers"
        PROMOTIONAL_POSTER = "PROMOTIONAL_POSTER", "Promotional Poster"
        CUSTOM_COLLECTION = "CUSTOM_COLLECTION", "Custom Collection"

    class ContentType(models.TextChoices):
        NONE = "NONE", "None"
        PRODUCTS = "PRODUCTS", "Products"
        CATEGORIES = "CATEGORIES", "Categories"
        BANNER = "BANNER", "Banner"

    section_type = models.CharField(
        max_length=30,
        choices=SectionType.choices,
        db_index=True,
    )
    title = models.CharField(max_length=255, blank=True)
    subtitle = models.CharField(max_length=512, blank=True)
    enabled = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)
    content_type = models.CharField(
        max_length=20,
        choices=ContentType.choices,
        default=ContentType.NONE,
    )
    linked_banner = models.ForeignKey(
        Banner,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="homepage_sections",
    )
    linked_categories = models.ManyToManyField(
        Category, blank=True, related_name="homepage_sections"
    )
    linked_products = models.ManyToManyField(
        Product, blank=True, related_name="homepage_sections"
    )
    max_items = models.PositiveIntegerField(default=12)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self):
        return f"{self.section_type}: {self.title or '(untitled)'}"