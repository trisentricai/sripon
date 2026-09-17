"""Customer coupon validation endpoint (Phase 7)."""
from decimal import Decimal

from rest_framework import status
from rest_framework.views import APIView

from apps.users.api import CUSTOMER_AUTH
from apps.users.authentication import IsCustomer
from config.pagination import error_response, success_response
from config.throttles import CouponThrottle

from .services import CouponError, evaluate_coupon


class CouponValidateView(APIView):
    """POST /coupons/validate/ - check a coupon against the active cart
    (or an explicit order_value) and return the discount amount."""

    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]
    throttle_classes = [CouponThrottle]

    def post(self, request):
        code = request.data.get("code")
        if not code:
            return error_response(
                "Coupon code is required.",
                {},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_value = request.data.get("order_value")
        if order_value is None:
            from apps.cart.services import cart_summary, get_or_create_cart

            cart = get_or_create_cart(request.user)
            summary = cart_summary(cart)
            order_value = summary["subtotal"]
        try:
            order_value = Decimal(str(order_value))
        except Exception:
            return error_response(
                "Invalid order value.",
                {},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            discount = evaluate_coupon(code, request.user, order_value)
        except CouponError as exc:
            return error_response(str(exc), {}, status=status.HTTP_400_BAD_REQUEST)

        return success_response(
            {"valid": True, "code": code.strip().upper(), "discount": discount},
            message="Coupon applied.",
        )
