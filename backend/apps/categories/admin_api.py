"""Admin category CRUD (Phase 12)."""
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView

from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsProductManager
from config.pagination import success_response

from .models import Category
from .serializers import CategoryAdminSerializer


def _with_counts():
    return Category.objects.select_related("parent").annotate(
        product_count=Count(
            "products",
            filter=Q(products__is_active=True),
        )
    )


class CategoryAdminCollectionView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]

    def get(self, request):
        queryset = _with_counts().order_by("sort_order", "name")
        search = request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)
        active = request.query_params.get("active")
        if active in ("true", "false"):
            queryset = queryset.filter(active=active == "true")
        parent = request.query_params.get("parent")
        if parent:
            queryset = queryset.filter(parent_id=parent)
        return success_response(CategoryAdminSerializer(queryset, many=True).data)

    def post(self, request):
        serializer = CategoryAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return success_response(
            CategoryAdminSerializer(category).data,
            message="Category created.",
            status=status.HTTP_201_CREATED,
        )


class CategoryAdminDetailView(APIView):
    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]

    def get(self, request, category_id):
        category = get_object_or_404(_with_counts(), pk=category_id)
        return success_response(CategoryAdminSerializer(category).data)

    def patch(self, request, category_id):
        category = get_object_or_404(Category, pk=category_id)
        serializer = CategoryAdminSerializer(
            category, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        category = serializer.save()
        return success_response(
            CategoryAdminSerializer(category).data, message="Category updated."
        )

    def delete(self, request, category_id):
        category = get_object_or_404(Category, pk=category_id)
        if category.products.exists():
            category.active = False
            category.save(update_fields=["active", "updated_at"])
            return success_response(
                None,
                message="Category has products; it was deactivated instead.",
            )
        category.delete()
        return success_response(None, message="Category deleted.")