"""Admin homepage CMS (Phase 10, CONTENT_MGR+): CRUD, reorder, enable/disable."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView

from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsContentManager
from config.pagination import error_response, success_response

from . import services
from .models import HomepageSection
from .serializers import (
    HomeSectionAdminSerializer,
    HomeSectionReorderSerializer,
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