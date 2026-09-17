"""Customer notification inbox and admin send (Phase 14)."""
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.views import APIView

from apps.users.api import ADMIN_AUTH, CUSTOMER_AUTH
from apps.users.authentication import IsContentManager, IsCustomer
from apps.users.models import UserProfile
from config.pagination import (
    StandardPagination,
    error_response,
    success_response,
)

from . import services
from .models import Notification
from .serializers import (
    AdminNotificationSendSerializer,
    NotificationSerializer,
)


class NotificationCollectionView(APIView):
    """GET /notifications/ - current customer's notifications (paginated)."""

    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]
    pagination_class = StandardPagination

    def get(self, request):
        queryset = (
            Notification.objects.filter(
                Q(customer=request.user) | Q(customer__isnull=True)
            )
            .order_by("-created_at")
            .distinct()
        )
        pagination = StandardPagination()
        page = pagination.paginate_queryset(queryset, request, view=self)
        return pagination.get_paginated_response(
            NotificationSerializer(page, many=True).data
        )


class NotificationDetailView(APIView):
    """GET/PATCH /notifications/{id}/ - view and mark a notification read."""

    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]

    def get(self, request, notification_id):
        notification = get_object_or_404(
            Notification,
            pk=notification_id,
            customer=request.user,
        )
        return success_response(NotificationSerializer(notification).data)

    def patch(self, request, notification_id):
        notification = get_object_or_404(
            Notification,
            pk=notification_id,
            customer=request.user,
        )
        services.mark_read(notification, request.user)
        return success_response(
            NotificationSerializer(notification).data, message="Marked as read."
        )


class NotificationUnreadCountView(APIView):
    """GET /notifications/unread-count/ - badge count for the app."""

    authentication_classes = CUSTOMER_AUTH
    permission_classes = [IsCustomer]

    def get(self, request):
        count = Notification.objects.filter(
            customer=request.user, read_at__isnull=True
        ).count()
        return success_response({"unread": count})


class AdminNotificationSendView(APIView):
    """POST /admin/notifications/send/ - dispatch a notification.

    With ``customer_id`` it targets one customer; otherwise it broadcasts to
    every active customer. OPTIONAL push via FCM.
    """

    authentication_classes = ADMIN_AUTH
    permission_classes = [IsContentManager]

    def post(self, request):
        serializer = AdminNotificationSendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payload = data.get("payload", {})
        ntype = data["type"]
        title = data["title"]
        body = data.get("body", "")

        customer_id = data.get("customer_id")
        if customer_id is not None:
            customer = get_object_or_404(UserProfile, pk=customer_id)
            notification = services.send_customer_notification(
                customer=customer,
                title=title,
                body=body,
                ntype=ntype,
                payload=payload,
                push=data.get("push", True),
                event="ADMIN_SEND",
            )
            return success_response(
                NotificationSerializer(notification).data,
                message="Notification sent.",
                status=status.HTTP_201_CREATED,
            )

        customers = UserProfile.objects.filter(active=True)
        created = 0
        dispatched = 0
        for customer in customers.iterator(chunk_size=500):
            services.create_in_app_notification(
                customer=customer,
                title=title,
                body=body,
                ntype=ntype,
                payload=payload,
            )
            created += 1
            if data.get("push", True):
                dispatched += services.dispatch_push(
                    customer=customer,
                    title=title,
                    body=body,
                    payload=payload,
                    event="ADMIN_BROADCAST",
                )

        return success_response(
            {"created": created, "push_dispatched": dispatched},
            message="Broadcast sent.",
            status=status.HTTP_201_CREATED,
        )