"""Public banner endpoint (Phase 9). Serves only live banners."""
from rest_framework.views import APIView

from .models import Banner
from .serializers import BannerSerializer
from .services import live_banners
from config.pagination import error_response, success_response


class BannerCollectionView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        placement = request.query_params.get("placement", "").strip().upper()
        if placement:
            valid = {value for value, _ in Banner.Placement.choices}
            if placement not in valid:
                return error_response(
                    f"Unknown placement '{placement}'.", status=400
                )
        banners = live_banners(placement)
        return success_response(BannerSerializer(banners, many=True).data)


class BannerDetailView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request, banner_id):
        banner = live_banners().filter(pk=banner_id).first()
        if banner is None:
            return error_response("Banner not found.", status=404)
        return success_response(BannerSerializer(banner).data)