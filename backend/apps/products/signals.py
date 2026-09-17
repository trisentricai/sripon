"""Signal handlers that keep Cloudinary in sync with the database."""
from django.db.models.signals import post_delete
from django.dispatch import receiver

from apps.common import storage

from .models import ProductImage


@receiver(post_delete, sender=ProductImage)
def delete_cloudinary_asset(sender, instance, **kwargs):
    """Remove the Cloudinary asset whenever an image row is deleted."""
    storage.delete_image(instance.public_id)