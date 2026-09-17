from django.urls import path

from . import api

urlpatterns = [
    path("initiate/<str:order_number>/", api.PaymentInitiateView.as_view(), name="payment-initiate"),
    path("<uuid:payment_id>/", api.PaymentStatusView.as_view(), name="payment-status"),
    path("mock/success/", api.PaymentMockConfirmView.as_view(), name="payment-mock-success"),
    path("webhook/<str:provider>/", api.PaymentWebhookView.as_view(), name="payment-webhook"),
]