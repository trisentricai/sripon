import time

from django.test import TestCase

from apps.common.models import TimeStampedModel
from apps.users.models import UserProfile


class TimeStampedModelTests(TestCase):
    def test_timestamps_are_auto_populated(self):
        model = UserProfile.objects.create(
            firebase_uid="ts-1", name="Timed", email="t@sripon.in"
        )
        self.assertIsNotNone(model.created_at)
        self.assertIsNotNone(model.updated_at)
        self.assertGreaterEqual(model.updated_at, model.created_at)
        self.assertTrue(TimeStampedModel in UserProfile.__mro__)

    def test_updated_at_changes_on_modification(self):
        model = UserProfile.objects.create(
            firebase_uid="ts-2", name="A", email="a@sripon.in"
        )
        original_updated = model.updated_at
        time.sleep(0.01)
        model.name = "B"
        model.save()
        model.refresh_from_db()
        self.assertGreater(model.updated_at, original_updated)
        self.assertEqual(model.created_at, model.__class__.objects.get(pk=model.pk).created_at)