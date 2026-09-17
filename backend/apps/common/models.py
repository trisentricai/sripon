from django.db import models


class TimeStampedModel(models.Model):
    """Adds ``created_at`` / ``updated_at`` to every SriPon model."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class CloudinaryImageMeta:
    """Normalises the shape of Cloudinary image metadata stored in JSON.

    Guards: ``{public_id, secure_url, width, height, format}``.
    Stored inside a JSONField so PostgreSQL never holds binary blobs.
    """

    @staticmethod
    def blank():
        return {}

    @staticmethod
    def of(public_id: str, secure_url: str, width=None, height=None, resource_format=None):
        payload = {
            "public_id": public_id,
            "secure_url": secure_url,
            "width": width,
            "height": height,
        }
        if resource_format:
            payload["format"] = resource_format
        return payload