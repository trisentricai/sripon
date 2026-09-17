"""Admin homepage CMS (Phase 10, CONTENT_MGR+): CRUD, reorder, enable/disable."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView

from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsContentManager, IsSettingsManager
from config.pagination import error_response, success_response

from . import services
from .models import HomepageSection, SiteSetting
from .serializers import (
    HomeSectionAdminSerializer,
    HomeSectionReorderSerializer,
    SiteSettingSerializer,
)


class HomeAdminCollectionView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]

    def get(self, request):
        sections = HomepageSection.objects.all()
        return success_response(HomeSectionAdminSerializer(sections, many=True).data)

    def post(self, request):
        serializer = HomeSectionAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        section = serializer.save()
        return success_response(
            HomeSectionAdminSerializer(section).data, status=status.HTTP_201_CREATED
        )


class HomeAdminDetailView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]

    def get(self, request, section_id):
        section = get_object_or_404(HomepageSection, pk=section_id)
        return success_response(HomeSectionAdminSerializer(section).data)

    def patch(self, request, section_id):
        section = get_object_or_404(HomepageSection, pk=section_id)
        serializer = HomeSectionAdminSerializer(section, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(HomeSectionAdminSerializer(section).data)

    def delete(self, request, section_id):
        section = get_object_or_404(HomepageSection, pk=section_id)
        section.delete()
        return success_response(None, message="Section deleted.")


class HomeAdminReorderView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]

    def post(self, request):
        serializer = HomeSectionReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.reorder_sections(serializer.validated_data["ids"])
        return success_response(None, message="Sections reordered.")


class SiteSettingCollectionView(APIView):
    """GET/POST /admin/settings/ - list and upsert site settings."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsSettingsManager]

    def get(self, request):
        queryset = SiteSetting.objects.all().order_by("group", "key")
        group = request.query_params.get("group")
        if group:
            queryset = queryset.filter(group=group)
        return success_response(SiteSettingSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = SiteSettingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        setting = serializer.save()
        return success_response(
            SiteSettingSerializer(setting).data,
            message="Setting saved.",
            status=201,
        )


class SiteSettingDetailView(APIView):
    """GET/PATCH/DELETE /admin/settings/{key}/ - single setting by key."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsSettingsManager]

    def get(self, request, key):
        setting = get_object_or_404(SiteSetting, key=key)
        return success_response(SiteSettingSerializer(setting).data)

    def patch(self, request, key):
        setting = get_object_or_404(SiteSetting, key=key)
        serializer = SiteSettingSerializer(
            setting, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        setting = serializer.save()
        return success_response(
            SiteSettingSerializer(setting).data, message="Setting updated."
        )

    def delete(self, request, key):
        setting = get_object_or_404(SiteSetting, key=key)
        setting.delete()
        return success_response(None, message="Setting deleted.")