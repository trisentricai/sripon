"""Banner media operations (Phase 9).

Variants (DESKTOP/MOBILE/IMAGE) are unique per banner; uploading a variant
replaces it and cleans up the previous Cloudinary asset. Deleting a banner
destroys every variant asset.
"""
import copy
from typing import BinaryIO

from django.db import transaction
from django.utils import timezone

from apps.common import storage

from .models import Banner, BannerImage


def upload_banner_image(
    banner: Banner, variant: str, image: BinaryIO, alt_text: str = ""
) -> BannerImage:
    """Upload (or replace) a single banner variant image on Cloudinary."""
    if variant not in BannerImage.Variant.values:
        raise ValueError(f"Unknown banner variant: {variant}")

    holder = _variant_holder(banner, variant)
    previous_public_id = holder.public_id if holder is not None else None

    payload = storage.upload_image(
        image,
        folder=storage.default_folder("banners"),
        tags=["banner", str(banner.pk)],
    )

    with transaction.atomic():
        banner_image, _ = BannerImage.objects.update_or_create(
            banner=banner,
            variant=variant,
            defaults={
                "public_id": payload["public_id"],
                "secure_url": payload["secure_url"],
                "width": payload.get("width"),
                "height": payload.get("height"),
                "alt_text": alt_text,
            },
        )

    if previous_public_id and previous_public_id != payload["public_id"]:
        storage.delete_image(previous_public_id)

    return banner_image


def delete_banner_image(banner: Banner, variant: str) -> bool:
    """Remove one variant's record and Cloudinary asset. Returns False if absent."""
    holder = _variant_holder(banner, variant)
    if holder is None:
        return False
    public_id = holder.public_id
    with transaction.atomic():
        holder.delete()
    storage.delete_image(public_id)
    return True


def delete_banner(banner: Banner) -> None:
    """Delete a banner and destroy every image variant's Cloudinary asset."""
    public_ids = list(banner.images.values_list("public_id", flat=True))
    with transaction.atomic():
        banner.delete()
    for public_id in public_ids:
        storage.delete_image(public_id)


def duplicate_banner(source: Banner, manager) -> Banner:
    """Copy scalar fields; variant rows are copied (shared assets)."""
    banner = Banner(
        title=(source.title or f"Banner {source.pk}") + " (copy)",
        subtitle=source.subtitle,
        placement=source.placement,
        cta_text=source.cta_text,
        cta_action=source.cta_action,
        link_product_id=source.link_product_id,
        link_category_id=source.link_category_id,
        custom_url=source.custom_url,
        overlay_text_enabled=source.overlay_text_enabled,
        text_alignment=source.text_alignment,
        button_visible=source.button_visible,
        display_priority=source.display_priority,
        start_date=source.start_date,
        end_date=source.end_date,
        active=False,
        manager=manager,
    )
    with transaction.atomic():
        banner.save()
        for image in source.images.all():
            BannerImage.objects.create(
                banner=banner,
                variant=image.variant,
                public_id=image.public_id,
                secure_url=image.secure_url,
                width=image.width,
                height=image.height,
                alt_text=image.alt_text,
            )
    return banner


def live_banners(placement: str = ""):
    """Active banners that are within (or without) their scheduling window."""
    from django.db.models import Q

    now = timezone.now()
    queryset = Banner.objects.filter(
        Q(start_date__isnull=True) | Q(start_date__lte=now),
        Q(end_date__isnull=True) | Q(end_date__gte=now),
        active=True,
    )
    if placement:
        return queryset.filter(placement=placement)
    return queryset


def _variant_holder(banner: Banner, variant: str) -> BannerImage | None:
    return banner.images.filter(variant=variant).first()