"""Cloudinary-backed media storage.

All image uploads flow through the backend; credentials never reach the
frontends. The database only ever stores the returned metadata
(``public_id``/``secure_url``/dimensions), never binaries.

Usage::

    payload = upload_image(file, folder="products", public_id="sku-1")
    delete_image(payload["public_id"])
    url = build_url(payload["public_id"], variant="card")
"""
import logging

import cloudinary
import cloudinary.uploader
import cloudinary.utils
from django.conf import settings

from .models import CloudinaryImageMeta

logger = logging.getLogger("apps.common")

TRANSFORMATIONS = {
    "thumbnail": {"width": 150, "height": 150, "crop": "fill", "quality": "auto"},
    "card": {"width": 400, "height": 400, "crop": "fill", "quality": "auto"},
    "detail": {"width": 900, "height": 1200, "crop": "limit", "quality": "auto"},
    "banner": {"width": 1600, "height": 600, "crop": "limit", "quality": "auto"},
    "banner_mobile": {"width": 800, "height": 800, "crop": "limit", "quality": "auto"},
    "avatar": {"width": 200, "height": 200, "crop": "fill", "quality": "auto"},
}

_config_applied = False


class CloudinaryNotConfigured(Exception):
    """Raised when an upload is attempted without Cloudinary credentials."""


def is_configured() -> bool:
    cfg = settings.CLOUDINARY
    return bool(
        cfg.get("CLOUD_NAME") and cfg.get("API_KEY") and cfg.get("API_SECRET")
    )


def configure() -> None:
    """Apply Cloudinary credentials from settings exactly once."""
    global _config_applied
    if _config_applied:
        return
    cfg = settings.CLOUDINARY
    cloudinary.config(
        cloud_name=cfg.get("CLOUD_NAME", ""),
        api_key=cfg.get("API_KEY", ""),
        api_secret=cfg.get("API_SECRET", ""),
        secure=cfg.get("SECURE", True),
    )
    _config_applied = True


def reset_configuration() -> None:
    """Force re-configuration (used after settings changes in tests)."""
    global _config_applied
    _config_applied = False


def default_folder(subfolder: str = "") -> str:
    base = settings.CLOUDINARY.get("FOLDER", "sripon").strip("/")
    if subfolder:
        return f"{base}/{subfolder.strip('/')}"
    return base


def upload_image(image, folder=None, public_id=None, tags=None, **options) -> dict:
    """Upload an image and return its normalised metadata payload."""
    if not is_configured():
        raise CloudinaryNotConfigured("Cloudinary credentials are not configured.")
    configure()
    result = cloudinary.uploader.upload(
        image,
        folder=folder or default_folder(),
        public_id=public_id,
        tags=tags,
        resource_type="image",
        **options,
    )
    return CloudinaryImageMeta.of(
        result.get("public_id", ""),
        result.get("secure_url", ""),
        width=result.get("width"),
        height=result.get("height"),
        resource_format=result.get("format"),
    )


def delete_image(public_id: str) -> bool:
    """Best-effort removal of a Cloudinary asset.

    Never lets a remote failure break a database operation; the problem is
    logged so it can be reconciled later.
    """
    if not public_id or not is_configured():
        return False
    configure()
    try:
        cloudinary.uploader.destroy(public_id, invalidate=True)
        return True
    except Exception:  # pragma: no cover - network/SDK failure path
        logger.warning("Failed to delete Cloudinary asset %s", public_id)
        return False


def delete_payload_asset(payload) -> bool:
    """Delete the asset referenced by a stored image payload dict."""
    if not isinstance(payload, dict):
        return False
    return delete_image(payload.get("public_id", ""))


def build_url(public_id: str, variant: str = "detail") -> str:
    """Return a Cloudinary delivery URL with the named transformation."""
    if not public_id:
        return ""
    configure()
    transformation = TRANSFORMATIONS.get(variant)
    url, _ = cloudinary.utils.cloudinary_url(
        public_id,
        **({"transformation": transformation} if transformation else {}),
    )
    return url