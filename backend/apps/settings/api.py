"""Public homepage endpoint (Phase 10). Rendered sections only."""
from rest_framework.views import APIView

from config.pagination import success_response

from .models import HomepageSection
from .serializers import HomeSectionSerializer


class HomeView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        sections = HomepageSection.objects.filter(enabled=True)
        return success_response(HomeSectionSerializer(sections, many=True).data)