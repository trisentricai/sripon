"""Admin product media endpoints (Phase 5).

Product managers upload, reorder and delete product images. Binaries go to
Cloudinary; only metadata reaches the database.
"""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from apps.common.storage import CloudinaryNotConfigured
from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsProductManager
from config.pagination import error_response, success_response

from . import services
from .models import Product, ProductImage
from .serializers import (
    ProductImageReorderSerializer,
    ProductImageSerializer,
    ProductImageUploadSerializer,
)

MAX_IMAGE_BYTES = 5 * 1024 * 1024


class ProductImageCollectionView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        images = product.images.order_by("-is_primary", "sort_order", "id")
        return success_response(ProductImageSerializer(images, many=True).data)

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)

        files = request.FILES.getlist("images") or request.FILES.getlist("image")
        if not files:
            return error_response(
                "No image file supplied.",
                {"image": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for upload in files:
            if upload.size > MAX_IMAGE_BYTES:
                return error_response(
                    "Image is too large (5 MB maximum).",
                    {"image": ["File exceeds the 5 MB limit."]},
                    status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                )
            content_type = getattr(upload, "content_type", "") or ""
            if not content_type.startswith("image/"):
                return error_response(
                    "Unsupported file type.",
                    {"image": ["Only image uploads are accepted."]},
                    status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                )

        meta = ProductImageUploadSerializer(
            data={key: value for key, value in request.data.items() if key != "image"}
        )
        meta.is_valid(raise_exception=True)
        options = meta.validated_data

        created = []
        try:
            for index, upload in enumerate(files):
                sort_order = options.get("sort_order")
                if sort_order is not None:
                    sort_order += index
                created.append(
                    services.add_product_image(
                        product,
                        upload,
                        alt_text=options.get("alt_text", ""),
                        is_primary=options.get("is_primary", False) and index == 0,
                        sort_order=sort_order,
                    )
                )
        except CloudinaryNotConfigured:
            return error_response(
                "Image storage is not configured.",
                {},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return success_response(
            ProductImageSerializer(created, many=True).data,
            message="Images uploaded.",
            status=status.HTTP_201_CREATED,
        )


class ProductImageDetailView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]

    def delete(self, request, product_id, image_id):
        product = get_object_or_404(Product, pk=product_id)
        if not ProductImage.objects.filter(pk=image_id, product=product).exists():
            return error_response(
                "Image not found.", {}, status=status.HTTP_404_NOT_FOUND
            )
        services.delete_product_image(product, image_id)
        return success_response(None, message="Image deleted.")


class ProductImageReorderView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]

    def post(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        serializer = ProductImageReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        images = services.reorder_product_images(
            product, serializer.validated_data["items"]
        )
        return success_response(
            ProductImageSerializer(images, many=True).data,
            message="Images reordered.",
        )


class ProductImagePrimaryView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]

    def post(self, request, product_id, image_id):
        product = get_object_or_404(Product, pk=product_id)
        image = services.set_primary_image(product, image_id)
        if image is None:
            return error_response(
                "Image not found.", {}, status=status.HTTP_404_NOT_FOUND
            )
        return success_response(
            ProductImageSerializer(image).data, message="Primary image updated."
        )