from rest_framework.views import APIView

from apps.users.api import CUSTOMER_AUTH
from apps.users.authentication import IsCustomer

from .models import Payment
from .serializers import MockConfirmSerializer, PaymentSerializer
from .services import handle_callback, initiate_payment, mock_confirm
from config.pagination import error_response, success_response


class PaymentInitiateView(APIView):
    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]

    def post(self, request, order_number):
        order = request.user.orders.filter(order_number=order_number).first()
        if order is None:
            return error_response(
                "Order not found or not owned by you.", status=404
            )
        try:
            payment = initiate_payment(order)
        except Exception as exc:
            return error_response(str(exc), status=400)
        return success_response(PaymentSerializer(payment).data, status=201)


class PaymentStatusView(APIView):
    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]

    def get(self, request, payment_id):
        payment = Payment.objects.filter(
            payment_id=payment_id, order__customer=request.user
        ).first()
        if payment is None:
            return error_response("Payment not found.", status=404)
        return success_response(PaymentSerializer(payment).data)


class PaymentWebhookView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request, provider):
        try:
            payment = handle_callback(provider, request.data, request.headers)
        except Exception as exc:
            return error_response(str(exc), status=400)
        return success_response(PaymentSerializer(payment).data)


class PaymentMockConfirmView(APIView):
    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]

    def post(self, request):
        serializer = MockConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment = Payment.objects.filter(
            payment_id=serializer.validated_data["payment_id"],
            order__customer=request.user,
        ).first()
        if payment is None:
            return error_response("Payment not found.", status=404)
        try:
            payment = mock_confirm(payment)
        except Exception as exc:
            return error_response(str(exc), status=400)
        return success_response(PaymentSerializer(payment).data)