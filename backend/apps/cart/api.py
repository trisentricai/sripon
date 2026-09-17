"""Customer cart and wishlist endpoints (Phase 6).

Totals are always recalculated server-side from current product prices.
"""
from rest_framework import status
from rest_framework.views import APIView

from apps.products.models import Product
from apps.users.api import CUSTOMER_AUTH
from apps.users.authentication import IsCustomer
from config.pagination import error_response, success_response

from . import services
from .serializers import (
    AddCartItemSerializer,
    CartSerializer,
    MergeCartSerializer,
    MoveToCartSerializer,
    UpdateCartItemSerializer,
    WishlistSerializer,
)


def cart_error(exc):
    return error_response(str(exc), {}, status=status.HTTP_400_BAD_REQUEST)


def product_not_found():
    return error_response("Product not found.", {}, status=status.HTTP_404_NOT_FOUND)


class CustomerApiView(APIView):
    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]


class CartView(CustomerApiView):
    def get(self, request):
        cart = services.get_or_create_cart(request.user)
        return success_response(CartSerializer(cart).data)


class CartItemCollectionView(CustomerApiView):
    def post(self, request):
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        product = Product.objects.filter(pk=data["product_id"]).first()
        if product is None:
            return product_not_found()

        cart = services.get_or_create_cart(request.user)
        try:
            services.add_item(cart, product, data["quantity"])
        except services.CartError as exc:
            return cart_error(exc)

        cart.refresh_from_db()
        return success_response(
            CartSerializer(cart).data,
            message="Item added to cart.",
            status=status.HTTP_201_CREATED,
        )


class CartItemDetailView(CustomerApiView):
    def patch(self, request, item_id):
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = services.get_or_create_cart(request.user)
        try:
            services.update_item(cart, item_id, serializer.validated_data["quantity"])
        except services.CartError as exc:
            return cart_error(exc)

        return success_response(CartSerializer(cart).data, message="Cart updated.")

    def delete(self, request, item_id):
        cart = services.get_or_create_cart(request.user)
        if not services.remove_item(cart, item_id):
            return error_response(
                "Cart item not found.", {}, status=status.HTTP_404_NOT_FOUND
            )
        return success_response(CartSerializer(cart).data, message="Item removed.")


class CartClearView(CustomerApiView):
    def post(self, request):
        cart = services.get_or_create_cart(request.user)
        services.clear_cart(cart)
        return success_response(CartSerializer(cart).data, message="Cart cleared.")


class CartMergeView(CustomerApiView):
    def post(self, request):
        serializer = MergeCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        cart = services.get_or_create_cart(request.user)
        result = services.merge_items(cart, serializer.validated_data["items"])

        payload = CartSerializer(cart).data
        payload["merge"] = result
        return success_response(payload, message="Cart merged.")


class WishlistView(CustomerApiView):
    def get(self, request):
        wishlist = services.get_or_create_wishlist(request.user)
        return success_response(WishlistSerializer(wishlist).data)


class WishlistItemCollectionView(CustomerApiView):
    def post(self, request):
        product_id = request.data.get("product_id")
        product = Product.objects.filter(pk=product_id).first()
        if product is None:
            return product_not_found()

        wishlist = services.get_or_create_wishlist(request.user)
        services.add_to_wishlist(wishlist, product)
        return success_response(
            WishlistSerializer(wishlist).data,
            message="Added to wishlist.",
            status=status.HTTP_201_CREATED,
        )


class WishlistItemDetailView(CustomerApiView):
    def delete(self, request, product_id):
        wishlist = services.get_or_create_wishlist(request.user)
        if not services.remove_from_wishlist(wishlist, product_id):
            return error_response(
                "Wishlist item not found.", {}, status=status.HTTP_404_NOT_FOUND
            )
        return success_response(
            WishlistSerializer(wishlist).data, message="Removed from wishlist."
        )


class WishlistMoveToCartView(CustomerApiView):
    def post(self, request, product_id):
        serializer = MoveToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = Product.objects.filter(pk=product_id).first()
        if product is None:
            return product_not_found()

        wishlist = services.get_or_create_wishlist(request.user)
        cart = services.get_or_create_cart(request.user)
        try:
            services.move_to_cart(
                wishlist,
                cart,
                product,
                serializer.validated_data["quantity"],
            )
        except services.CartError as exc:
            return cart_error(exc)

        return success_response(CartSerializer(cart).data, message="Moved to cart.")