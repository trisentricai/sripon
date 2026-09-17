"""Admin banner CRUD + variant images (Phase 9, CONTENT_MGR+)."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from apps.common.storage import CloudinaryNotConfigured
from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsContentManager
from config.pagination import error_response, success_response

from . import services
from .models import Banner
from .serializers import (
    BannerAdminSerializer,
    BannerVariantUploadSerializer,
)

MAX_IMAGE_BYTES = 5 * 1024 * 1024


class BannerAdminCollectionView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]

    def get(self, request):
        queryset = Banner.objects.all()
        placement = request.query_params.get("placement", "").strip().upper()
        active = request.query_params.get("active")
        search = request.query_params.get("search", "").strip()
        if placement:
            queryset = queryset.filter(placement=placement)
        if active in ("true", "false"):
            queryset = queryset.filter(active=active == "true")
        if search:
            queryset = queryset.filter(title__icontains=search)
        return success_response(BannerAdminSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = BannerAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        banner = serializer.save(manager=request.user)
        return success_response(
            BannerAdminSerializer(banner).data, status=status.HTTP_201_CREATED
        )


class BannerAdminDetailView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]

    def get(self, request, banner_id):
        banner = get_object_or_404(Banner, pk=banner_id)
        return success_response(BannerAdminSerializer(banner).data)

    def patch(self, request, banner_id):
        banner = get_object_or_404(Banner, pk=banner_id)
        serializer = BannerAdminSerializer(banner, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(BannerAdminSerializer(banner).data)

    def delete(self, request, banner_id):
        banner = get_object_or_404(Banner, pk=banner_id)
        services.delete_banner(banner)
        return success_response(None, message="Banner deleted.")


class BannerDuplicateView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]

    def post(self, request, banner_id):
        banner = get_object_or_404(Banner, pk=banner_id)
        clone = services.duplicate_banner(banner, request.user)
        return success_response(
            BannerAdminSerializer(clone).data,
            message="Banner duplicated.",
            status=status.HTTP_201_CREATED,
        )


class BannerImageCollectionView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, banner_id):
        banner = get_object_or_404(Banner, pk=banner_id)
        upload = request.FILES.get("file") or request.FILES.get("image")
        if upload is None:
            return error_response(
                "No image file supplied.",
                {"file": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if upload.size > MAX_IMAGE_BYTES:
            return error_response(
                "Image is too large (5 MB maximum).",
                {"file": ["File exceeds the 5 MB limit."]},
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )
        content_type = getattr(upload, "content_type", "") or ""
        if not content_type.startswith("image/"):
            return error_response(
                "Unsupported file type.",
                {"file": ["Only image uploads are accepted."]},
                status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            )

        meta = BannerVariantUploadSerializer(data=request.data)
        meta.is_valid(raise_exception=True)
        variant = meta.validated_data["variant"]

        try:
            image = services.upload_banner_image(
                banner, variant, upload, alt_text=request.data.get("alt_text", "")
            )
        except CloudinaryNotConfigured:
            return error_response(
                "Image storage is not configured.",
                {},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return success_response(
            {
                "variant": image.variant,
                "url": image.secure_url,
                "width": image.width,
                "height": image.height,
                "alt_text": image.alt_text,
            },
            message="Banner image uploaded.",
            status=status.HTTP_201_CREATED,
        )


class BannerImageDetailView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]

    def delete(self, request, banner_id, variant):
        banner = get_object_or_404(Banner, pk=banner_id)
        if not services.delete_banner_image(banner, variant):
            return error_response(
                "Variant image not found.", {}, status=status.HTTP_404_NOT_FOUND
            )
        return success_response(None, message="Banner image deleted.")