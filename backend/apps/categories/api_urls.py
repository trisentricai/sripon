"""URL routing for the public category catalogue (Phase 4)."""
from rest_framework.routers import DefaultRouter

from .api import CategoryViewSet

router = DefaultRouter()
router.register("", CategoryViewSet, basename="categories")

urlpatterns = router.urls