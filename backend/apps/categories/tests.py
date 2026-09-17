from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase

from apps.categories.models import Category


class CategoryTreeTests(TestCase):
    def setUp(self):
        self.parent = Category.objects.create(name="Flowers", slug="flowers")
        self.child = Category.objects.create(
            name="Fountains", slug="fountains", parent=self.parent
        )
        self.grandchild = Category.objects.create(
            name="Mini Fountains", slug="mini-fountains", parent=self.child
        )

    def test_str_renders_path(self):
        self.assertEqual(
            str(self.grandchild), "Flowers / Fountains / Mini Fountains"
        )

    def test_descendant_ids_includes_all_levels(self):
        self.assertEqual(self.parent.get_descendant_ids(), [self.child.id, self.grandchild.id])

    def test_leaf_has_no_descendants(self):
        self.assertEqual(self.grandchild.get_descendant_ids(), [])

    def test_unique_slug_enforced(self):
        with self.assertRaises(IntegrityError):
            Category.objects.create(name="Copy", slug="flowers")

    def test_unique_parent_name_enforced(self):
        with self.assertRaises(IntegrityError):
            Category.objects.create(
                name="Fountains", slug="duplicate-name", parent=self.parent
            )

    def test_parent_name_allowed_in_other_trees(self):
        other_parent = Category.objects.create(name="Lamps", slug="lamps")
        Category.objects.create(name="Fountains", slug="lamps-fountains", parent=other_parent)
        self.assertEqual(Category.objects.count(), 5)