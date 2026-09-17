"""Admin product media endpoints (Phase 5).

Product managers upload, reorder and delete product images. Binaries go to
Cloudinary; only metadata reaches the database.
"""
from django.db.models import ExpressionWrapper, F, IntegerField, Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from apps.common.storage import CloudinaryNotConfigured
from apps.users.api import ADMIN_AUTH
from apps.users.authentication import IsProductManager
from config.pagination import (
    StandardPagination,
    error_response,
    success_response,
)

from . import services
from .models import Inventory, InventoryTransaction, Product, ProductImage
from .serializers import (
    InventoryAdjustSerializer,
    InventorySerializer,
    InventoryTransactionSerializer,
    ProductAdminDetailSerializer,
    ProductAdminSerializer,
    ProductImageReorderSerializer,
    ProductImageSerializer,
    ProductImageUploadSerializer,
)

MAX_IMAGE_BYTES = 5 * 1024 * 1024


class AdminProductCollectionView(APIView):
    """GET/POST /admin/products/ - list and create products (Phase 12)."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]
    pagination_class = StandardPagination

    def get(self, request):
        queryset = (
            Product.objects.select_related("category")
            .prefetch_related("images")
            .order_by("-created_at")
        )
        params = request.query_params
        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(sku__icontains=search)
                | Q(brand__icontains=search)
                | Q(product_code__icontains=search)
            )
        category = params.get("category")
        if category:
            queryset = queryset.filter(category_id=category)
        is_active = params.get("is_active")
        if is_active in ("true", "false"):
            queryset = queryset.filter(is_active=is_active == "true")
        is_featured = params.get("is_featured")
        if is_featured in ("true", "false"):
            queryset = queryset.filter(is_featured=is_featured == "true")

        pagination = StandardPagination()
        page = pagination.paginate_queryset(queryset, request, view=self)
        return pagination.get_paginated_response(
            ProductAdminDetailSerializer(page, many=True).data
        )

    def post(self, request):
        serializer = ProductAdminSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        Inventory.ensure_for_product(product)
        return success_response(
            ProductAdminDetailSerializer(product).data,
            message="Product created.",
            status=status.HTTP_201_CREATED,
        )


class AdminProductDetailView(APIView):
    """GET/PATCH/DELETE /admin/products/{id}/ (Phase 12)."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]

    def get(self, request, product_id):
        product = get_object_or_404(
            Product.objects.select_related("category").prefetch_related("images"),
            pk=product_id,
        )
        return success_response(ProductAdminDetailSerializer(product).data)

    def patch(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        serializer = ProductAdminSerializer(
            product, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        product = serializer.save()
        inventory = Inventory.ensure_for_product(product)
        inventory.stock_quantity = product.stock_quantity
        inventory.reserved_quantity = product.reserved_quantity
        inventory.save(update_fields=["stock_quantity", "reserved_quantity", "updated_at"])
        return success_response(
            ProductAdminDetailSerializer(product).data, message="Product updated."
        )

    def delete(self, request, product_id):
        product = get_object_or_404(Product, pk=product_id)
        product.is_active = False
        product.save(update_fields=["is_active", "updated_at"])
        return success_response(None, message="Product deactivated.")


class AdminInventoryCollectionView(APIView):
    """GET /admin/inventory/ - stock ledger with low-stock filters."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]
    pagination_class = StandardPagination

    def get(self, request):
        queryset = Inventory.objects.select_related("product").annotate(
            _available=ExpressionWrapper(
                F("stock_quantity") - F("reserved_quantity"),
                output_field=IntegerField(),
            )
        )
        params = request.query_params
        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(product__name__icontains=search)
                | Q(product__sku__icontains=search)
            )
        state = params.get("state", "").strip().lower()
        if state == "low":
            queryset = queryset.filter(
                _available__gt=0, _available__lte=F("low_stock_threshold")
            )
        elif state == "out":
            queryset = queryset.filter(_available__lte=0)
        queryset = queryset.order_by("product__name")

        pagination = StandardPagination()
        page = pagination.paginate_queryset(queryset, request, view=self)
        return pagination.get_paginated_response(
            InventorySerializer(page, many=True).data
        )


class AdminInventoryDetailView(APIView):
    """GET/PATCH /admin/inventory/{product_id}/ - adjust stock manually."""

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsProductManager]

    def get(self, request, product_id):
        inventory = get_object_or_404(
            Inventory.objects.select_related("product"), product_id=product_id
        )
        transactions = InventoryTransaction.objects.filter(
            product_id=product_id
        ).select_related("admin_user")[:50]
        return success_response(
            {
                "inventory": InventorySerializer(inventory).data,
                "transactions": InventoryTransactionSerializer(
                    transactions, many=True
                ).data,
            }
        )

    def patch(self, request, product_id):
        inventory = get_object_or_404(Inventory, product_id=product_id)
        serializer = InventoryAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        new_stock = int(inventory.stock_quantity) + int(data["quantity_change"])
        if new_stock < 0:
            return error_response(
                "Adjustment would make stock negative.",
                {"quantity_change": ["Resulting stock cannot be negative."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inventory.stock_quantity = new_stock
        inventory.save(update_fields=["stock_quantity", "updated_at"])
        InventoryTransaction.objects.create(
            product_id=product_id,
            quantity_change=data["quantity_change"],
            reason=data["reason"],
            reference=data.get("reference", ""),
            admin_user=request.user,
        )
        inventory.sync_product_counts()
        return success_response(
            InventorySerializer(inventory).data, message="Stock adjusted."
        )


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