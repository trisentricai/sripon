"""Phase 14 notification endpoint tests."""
from unittest import mock

from django.test import TestCase
from rest_framework.test import APIClient

from apps.users.models import AdminUser, UserProfile

from .models import Notification, NotificationEventLog


class NotificationCustomerApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = UserProfile.objects.create(
            firebase_uid="notif-cust", name="Aarthi", email="aarthi@sripon.test"
        )
        self.other = UserProfile.objects.create(
            firebase_uid="notif-other", name="Bala", email="bala@sripon.test"
        )
        self.client.force_authenticate(user=self.customer)

    def _notification(self, customer, **kw):
        defaults = {"title": "Order placed", "body": "Your order is confirmed."}
        defaults.update(kw)
        return Notification.objects.create(customer=customer, **defaults)

    def test_requires_auth(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, 401)

    def test_list_own_notifications(self):
        self._notification(self.customer, title="Mine")
        self._notification(self.other, title="Not mine")
        self._notification(None, title="Broadcast")
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, 200)
        titles = [n["title"] for n in response.data["data"]]
        self.assertIn("Mine", titles)
        self.assertIn("Broadcast", titles)
        self.assertNotIn("Not mine", titles)

    def test_unread_count(self):
        self._notification(self.customer, title="Unread")
        self._notification(self.customer, title="Read", read_at=None)
        Notification.objects.filter(customer=self.customer, title="Read").update(
            read_at=None
        )
        # simulate one read
        read = self._notification(self.customer, title="ReadOne")
        from django.utils import timezone

        Notification.objects.filter(pk=read.pk).update(read_at=timezone.now())
        response = self.client.get("/api/v1/notifications/unread-count/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["data"]["unread"], 2)

    def test_mark_read(self):
        notification = self._notification(self.customer)
        response = self.client.patch(
            f"/api/v1/notifications/{notification.pk}/", {}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        notification.refresh_from_db()
        self.assertIsNotNone(notification.read_at)

    def test_mark_read_ignores_other_customers(self):
        notification = self._notification(self.other)
        response = self.client.patch(
            f"/api/v1/notifications/{notification.pk}/", {}, format="json"
        )
        self.assertEqual(response.status_code, 404)


class NotificationAdminApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = UserProfile.objects.create(
            firebase_uid="admin-notif-cust",
            name="Kavita",
            email="kavita@sripon.test",
        )
        self.content_mgr = AdminUser.objects.create(
            supabase_uid="cm-notif",
            email="cm-notif@sripon.test",
            role=AdminUser.Role.CONTENT_MANAGER,
            active=True,
        )
        self.analyst = AdminUser.objects.create(
            supabase_uid="analyst-notif",
            email="analyst-notif@sripon.test",
            role=AdminUser.Role.ANALYST,
            active=True,
        )
        self.client.force_authenticate(user=self.content_mgr)
        self.url = "/api/v1/admin/notifications/send/"

    def test_requires_permission(self):
        self.client.force_authenticate(user=self.analyst)
        response = self.client.post(
            self.url, {"type": "PROMO", "title": "Diwali"}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_send_to_single_customer(self):
        with mock.patch(
            "apps.notifications.services.dispatch_push", return_value=1
        ) as push:
            response = self.client.post(
                self.url,
                {
                    "type": "PROMO",
                    "title": "Diwali Offer",
                    "body": "Flat 20% off.",
                    "customer_id": self.customer.pk,
                },
                format="json",
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["title"], "Diwali Offer")
        self.assertTrue(
            Notification.objects.filter(customer=self.customer).exists()
        )
        push.assert_called_once()

    def test_send_broadcast(self):
        UserProfile.objects.create(
            firebase_uid="admin-notif-2", name="Ravi", email="ravi2@sripon.test"
        )
        with mock.patch(
            "apps.notifications.services.dispatch_push", return_value=0
        ):
            response = self.client.post(
                self.url, {"type": "SYSTEM", "title": "Maintenance"}, format="json"
            )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["data"]["created"], 2)

    def test_invalid_customer_rejected(self):
        response = self.client.post(
            self.url,
            {"type": "PROMO", "title": "x", "customer_id": 99999},
            format="json",
        )
        self.assertEqual(response.status_code, 400)


class NotificationServiceTests(TestCase):
    def setUp(self):
        self.customer = UserProfile.objects.create(
            firebase_uid="svc-notif", name="Meera", email="meera@sripon.test"
        )
        from apps.users.models import DeviceToken

        DeviceToken.objects.create(
            customer=self.customer, token="fcm-token-1", platform="ANDROID"
        )

    def test_dispatch_records_success_log(self):
        from . import services

        with mock.patch(
            "firebase_admin.messaging.send", return_value="msg-id"
        ):
            dispatched = services.dispatch_push(
                customer=self.customer, title="Hi", body="There", event="TEST"
            )
        self.assertEqual(dispatched, 1)
        self.assertTrue(
            NotificationEventLog.objects.filter(
                channel=NotificationEventLog.Channel.FCM, status="SUCCESS"
            ).exists()
        )

    def test_send_customer_notification_creates_in_app_row(self):
        from . import services

        with mock.patch(
            "firebase_admin.messaging.send", return_value="msg-id"
        ):
            notification = services.send_customer_notification(
                customer=self.customer,
                title="Welcome",
                ntype=Notification.Type.SYSTEM,
            )
        self.assertEqual(notification.customer, self.customer)
        self.assertEqual(notification.title, "Welcome")
