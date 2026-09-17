"""Product image operations backed by Cloudinary."""
from django.db import transaction
from django.db.models import Max

from apps.common import storage

from .models import Product, ProductImage


def add_product_image(
    product: Product,
    image,
    *,
    alt_text: str = "",
    is_primary: bool = False,
    sort_order: int | None = None,
) -> ProductImage:
    """Upload an image to Cloudinary and attach it to ``product``."""
    folder = storage.default_folder(f"products/{product.sku}")
    payload = storage.upload_image(image, folder=folder)

    with transaction.atomic():
        if sort_order is None:
            current_max = (
                ProductImage.objects.filter(product=product).aggregate(
                    value=Max("sort_order")
                )["value"]
                or 0
            )
            sort_order = current_max + 1

        if is_primary or not ProductImage.objects.filter(product=product).exists():
            ProductImage.objects.filter(product=product).update(is_primary=False)
            is_primary = True

        return ProductImage.objects.create(
            product=product,
            public_id=payload["public_id"],
            secure_url=payload["secure_url"],
            width=payload.get("width"),
            height=payload.get("height"),
            alt_text=alt_text,
            is_primary=is_primary,
            sort_order=sort_order,
        )


def delete_product_image(product: Product, image_id: int) -> None:
    """Remove an image; reshuffle the primary flag if needed.

    The Cloudinary asset is removed by the ``post_delete`` signal so every
    deletion path stays consistent.
    """
    try:
        image = ProductImage.objects.get(pk=image_id, product=product)
    except ProductImage.DoesNotExist:
        return
    was_primary = image.is_primary
    image.delete()

    if was_primary:
        replacement = (
            ProductImage.objects.filter(product=product)
            .order_by("sort_order", "id")
            .first()
        )
        if replacement is not None:
            ProductImage.objects.filter(pk=replacement.pk).update(is_primary=True)


def reorder_product_images(product: Product, items) -> list[ProductImage]:
    """Apply ``[{id, sort_order}, ...]`` to a product's images."""
    for item in items:
        ProductImage.objects.filter(pk=item["id"], product=product).update(
            sort_order=item["sort_order"]
        )
    return list(ProductImage.objects.filter(product=product).order_by("sort_order", "id"))


def set_primary_image(product: Product, image_id: int) -> ProductImage | None:
    image = ProductImage.objects.filter(pk=image_id, product=product).first()
    if image is None:
        return None
    with transaction.atomic():
        ProductImage.objects.filter(product=product).update(is_primary=False)
        ProductImage.objects.filter(pk=image.pk).update(is_primary=True)
    image.refresh_from_db()
    return image