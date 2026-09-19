from django.db import models

from apps.categories.models import Category
from apps.common.models import TimeStampedModel
from apps.products.models import Product
from apps.users.models import AdminUser


class Banner(TimeStampedModel):
    """Admin-controlled promotional banner/poster."""

    class Placement(models.TextChoices):
        HOME_HERO = "HOME_HERO", "Home Hero"
        HOME_SECONDARY = "HOME_SECONDARY", "Home Secondary"
        HOME_MIDDLE = "HOME_MIDDLE", "Home Middle"
        HOME_BOTTOM = "HOME_BOTTOM", "Home Bottom"
        CATEGORY_TOP = "CATEGORY_TOP", "Category Top"
        PRODUCT_PROMOTION = "PRODUCT_PROMOTION", "Product Promotion"
        APP_HOME = "APP_HOME", "App Home"

    class CtaAction(models.TextChoices):
        NONE = "NONE", "No Action"
        PRODUCT = "PRODUCT", "Link to Product"
        CATEGORY = "CATEGORY", "Link to Category"
        URL = "URL", "Custom URL"

    class TextAlignment(models.TextChoices):
        LEFT = "LEFT", "Left"
        CENTER = "CENTER", "Center"
        RIGHT = "RIGHT", "Right"

    title = models.CharField(max_length=255, blank=True)
    subtitle = models.CharField(max_length=512, blank=True)
    placement = models.CharField(
        max_length=30,
        choices=Placement.choices,
        default=Placement.HOME_HERO,
        db_index=True,
    )
    cta_text = models.CharField(max_length=40, blank=True)
    cta_action = models.CharField(
        max_length=20,
        choices=CtaAction.choices,
        default=CtaAction.NONE,
    )
    link_product = models.ForeignKey(
        Product,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_banners",
    )
    link_category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_banners",
    )
    custom_url = models.URLField(blank=True)
    overlay_text_enabled = models.BooleanField(default=True)
    text_alignment = models.CharField(
        max_length=10,
        choices=TextAlignment.choices,
        default=TextAlignment.LEFT,
    )
    button_visible = models.BooleanField(default=True)
    display_priority = models.PositiveIntegerField(default=0)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True, db_index=True)
    manager = models.ForeignKey(
        AdminUser,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_banners",
    )

    class Meta:
        ordering = ["display_priority", "created_at"]
        indexes = [models.Index(fields=["placement", "active"])]

    def __str__(self):
        return self.title or f"Banner {self.pk}"


class BannerImage(models.Model):
    """Variant image for a banner: desktop, mobile or legacy generic."""

    class Variant(models.TextChoices):
        DESKTOP = "DESKTOP", "Desktop"
        MOBILE = "MOBILE", "Mobile"
        IMAGE = "IMAGE", "Image"

    banner = models.ForeignKey(
        Banner,
        on_delete=models.CASCADE,
        related_name="images",
    )
    variant = models.CharField(max_length=20, choices=Variant.choices, default=Variant.IMAGE)
    public_id = models.CharField(max_length=200)
    secure_url = models.CharField(max_length=500)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["banner", "variant"],
                name="uniq_banner_variant",
            )
        ]

    def __str__(self):
        return f"{self.banner} ({self.variant})"


class Poster(TimeStampedModel):
    """Dedicated promotional poster, distinct from homepage banners.

    Posters are standalone marketing creatives (e.g. festival offers, brand
    campaigns) that the customer app surfaces outside the homepage
    banner placements.
    """

    class CtaAction(models.TextChoices):
        NONE = "NONE", "No Action"
        PRODUCT = "PRODUCT", "Link to Product"
        CATEGORY = "CATEGORY", "Link to Category"
        URL = "URL", "Custom URL"

    title = models.CharField(max_length=255, blank=True)
    subtitle = models.CharField(max_length=512, blank=True)
    cta_text = models.CharField(max_length=40, blank=True)
    cta_action = models.CharField(
        max_length=20,
        choices=CtaAction.choices,
        default=CtaAction.NONE,
    )
    custom_url = models.URLField(blank=True)
    link_product = models.ForeignKey(
        Product,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_posters",
    )
    link_category = models.ForeignKey(
        Category,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="linked_posters",
    )
    display_priority = models.PositiveIntegerField(default=0)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True, db_index=True)
    manager = models.ForeignKey(
        AdminUser,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="managed_posters",
    )

    class Meta:
        ordering = ["display_priority", "created_at"]
        indexes = [models.Index(fields=["active"])]

    def __str__(self):
        return self.title or f"Poster {self.pk}"


class PosterImage(models.Model):
    """Variant artwork for a poster: desktop or mobile."""

    class Variant(models.TextChoices):
        DESKTOP = "DESKTOP", "Desktop"
        MOBILE = "MOBILE", "Mobile"

    poster = models.ForeignKey(
        Poster,
        on_delete=models.CASCADE,
        related_name="images",
    )
    variant = models.CharField(max_length=20, choices=Variant.choices)
    public_id = models.CharField(max_length=200)
    secure_url = models.CharField(max_length=500)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    alt_text = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["poster", "variant"],
                name="uniq_poster_variant",
            )
        ]

    def __str__(self):
        return f"{self.poster} ({self.variant})"