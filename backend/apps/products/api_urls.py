"""URL routing for the public product catalogue (Phase 4)."""
from rest_framework.routers import DefaultRouter

from .api import ProductViewSet

router = DefaultRouter()
router.register("", ProductViewSet, basename="products")

urlpatterns = router.urls