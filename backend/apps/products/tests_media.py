from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.common import storage
from apps.products.models import Product, ProductImage
from apps.users.models import AdminUser

TEST_CLOUDINARY = {
    "CLOUD_NAME": "demo",
    "API_KEY": "test-key",
    "API_SECRET": "test-secret",
    "SECURE": True,
    "FOLDER": "sripon",
}

FakeResult = {
    "public_id": "sripon/products/BB-1/sample",
    "secure_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "width": 400,
    "height": 400,
    "format": "jpg",
}


def image_file(name="sample.jpg", content_type="image/jpeg"):
    return SimpleUploadedFile(name, b"fake-image-bytes", content_type=content_type)


class ProductMediaApiTestBase(TestCase):
    def setUp(self):
        storage.reset_configuration()
        self.client = APIClient()
        self.product = Product.objects.create(
            sku="BB-1", name="Big Bang", slug="big-bang", price="100"
        )
        self.product_manager = AdminUser.objects.create(
            supabase_uid="pm-1",
            email="pm@sripon.test",
            role=AdminUser.Role.PRODUCT_MANAGER,
            active=True,
        )
        self.analyst = AdminUser.objects.create(
            supabase_uid="an-1",
            email="analyst@sripon.test",
            role=AdminUser.Role.ANALYST,
            active=True,
        )
        self.images_url = f"/api/v1/admin/products/{self.product.id}/images/"

    def tearDown(self):
        storage.reset_configuration()

    def authenticate(self, user):
        self.client.force_authenticate(user=user)


@override_settings(CLOUDINARY=TEST_CLOUDINARY)
class ProductImageUploadTests(ProductMediaApiTestBase):
    @patch("cloudinary.uploader.upload", return_value=FakeResult)
    def test_upload_creates_image_and_marks_first_primary(self, mock_upload):
        self.authenticate(self.product_manager)
        response = self.client.post(
            self.images_url,
            {"image": image_file(), "alt_text": "Front"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["message"], "Images uploaded.")

        image = ProductImage.objects.get(product=self.product)
        self.assertTrue(image.is_primary)
        self.assertEqual(image.alt_text, "Front")
        self.assertEqual(image.public_id, FakeResult["public_id"])
        self.assertEqual(image.width, 400)
        self.assertIn("products/BB-1", mock_upload.call_args.kwargs["folder"])

    @patch("cloudinary.uploader.upload", return_value=FakeResult)
    def test_additional_upload_is_not_primary_and_sort_increments(self, _mock):
        self.authenticate(self.product_manager)
        self.client.post(self.images_url, {"image": image_file()}, format="multipart")
        self.client.post(self.images_url, {"image": image_file()}, format="multipart")

        images = list(ProductImage.objects.filter(product=self.product).order_by("sort_order"))
        self.assertEqual(len(images), 2)
        self.assertTrue(images[0].is_primary)
        self.assertFalse(images[1].is_primary)
        self.assertGreater(images[1].sort_order, images[0].sort_order)

    @patch("cloudinary.uploader.upload", return_value=FakeResult)
    def test_is_primary_flag_moves_primary(self, _mock):
        self.authenticate(self.product_manager)
        self.client.post(self.images_url, {"image": image_file()}, format="multipart")
        self.client.post(
            self.images_url,
            {"image": image_file(), "is_primary": "true"},
            format="multipart",
        )
        primaries = ProductImage.objects.filter(product=self.product, is_primary=True)
        self.assertEqual(primaries.count(), 1)
        self.assertEqual(primaries.get().sort_order, 2)

    @patch("cloudinary.uploader.upload", return_value=FakeResult)
    def test_upload_accepts_multiple_files(self, _mock):
        self.authenticate(self.product_manager)
        response = self.client.post(
            self.images_url,
            {"images": [image_file("a.jpg"), image_file("b.jpg")]},
            format="multipart",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.data["data"]), 2)
        self.assertEqual(ProductImage.objects.filter(product=self.product).count(), 2)

    def test_upload_without_file_is_rejected(self):
        self.authenticate(self.product_manager)
        response = self.client.post(self.images_url, {}, format="multipart")
        self.assertEqual(response.status_code, 400)

    def test_upload_rejects_non_image(self):
        self.authenticate(self.product_manager)
        response = self.client.post(
            self.images_url,
            {"image": image_file("notes.txt", "text/plain")},
            format="multipart",
        )
        self.assertEqual(response.status_code, 415)

    @override_settings(CLOUDINARY={"CLOUD_NAME": "", "API_KEY": "", "API_SECRET": "", "SECURE": True, "FOLDER": "sripon"})
    def test_upload_without_storage_returns_503(self):
        self.authenticate(self.product_manager)
        response = self.client.post(
            self.images_url, {"image": image_file()}, format="multipart"
        )
        self.assertEqual(response.status_code, 503)

    def test_anonymous_is_unauthorized(self):
        response = self.client.post(
            self.images_url, {"image": image_file()}, format="multipart"
        )
        self.assertEqual(response.status_code, 401)

    def test_role_without_product_permission_is_forbidden(self):
        self.authenticate(self.analyst)
        response = self.client.post(
            self.images_url, {"image": image_file()}, format="multipart"
        )
        self.assertEqual(response.status_code, 403)


@override_settings(CLOUDINARY=TEST_CLOUDINARY)
class ProductImageManagementTests(ProductMediaApiTestBase):
    def setUp(self):
        super().setUp()
        self.first = ProductImage.objects.create(
            product=self.product,
            public_id="sripon/products/BB-1/one",
            secure_url="https://res.cloudinary.com/demo/image/upload/one.jpg",
            is_primary=True,
            sort_order=1,
        )
        self.second = ProductImage.objects.create(
            product=self.product,
            public_id="sripon/products/BB-1/two",
            secure_url="https://res.cloudinary.com/demo/image/upload/two.jpg",
            sort_order=2,
        )

    def test_list_images(self):
        self.authenticate(self.product_manager)
        response = self.client.get(self.images_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["data"]), 2)
        self.assertEqual(response.data["data"][0]["id"], self.first.id)

    @patch("cloudinary.uploader.destroy")
    def test_delete_removes_row_and_cloudinary_asset(self, mock_destroy):
        self.authenticate(self.product_manager)
        response = self.client.delete(f"{self.images_url}{self.second.id}/")
        self.assertEqual(response.status_code, 200)
        self.assertFalse(ProductImage.objects.filter(pk=self.second.id).exists())
        mock_destroy.assert_called_once_with(self.second.public_id, invalidate=True)

    @patch("cloudinary.uploader.destroy")
    def test_delete_primary_promotes_next_image(self, _mock):
        self.authenticate(self.product_manager)
        self.client.delete(f"{self.images_url}{self.first.id}/")
        self.second.refresh_from_db()
        self.assertTrue(self.second.is_primary)

    def test_delete_unknown_image_returns_404(self):
        self.authenticate(self.product_manager)
        response = self.client.delete(f"{self.images_url}999999/")
        self.assertEqual(response.status_code, 404)

    def test_reorder_updates_sort_order(self):
        self.authenticate(self.product_manager)
        response = self.client.post(
            f"{self.images_url}reorder/",
            {
                "items": [
                    {"id": self.first.id, "sort_order": 5},
                    {"id": self.second.id, "sort_order": 3},
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.first.refresh_from_db()
        self.second.refresh_from_db()
        self.assertEqual(self.first.sort_order, 5)
        self.assertEqual(self.second.sort_order, 3)
        self.assertEqual(response.data["data"][0]["id"], self.second.id)

    def test_set_primary_image(self):
        self.authenticate(self.product_manager)
        response = self.client.post(f"{self.images_url}{self.second.id}/primary/")
        self.assertEqual(response.status_code, 200)
        self.first.refresh_from_db()
        self.second.refresh_from_db()
        self.assertFalse(self.first.is_primary)
        self.assertTrue(self.second.is_primary)

    @patch("cloudinary.uploader.destroy")
    def test_deleting_product_cleans_up_assets(self, mock_destroy):
        self.product.delete()
        self.assertEqual(mock_destroy.call_count, 2)
