from unittest.mock import patch

from django.test import TestCase, override_settings

from apps.common import storage

FakeResult = {
    "public_id": "sripon/products/BB-1/sample",
    "secure_url": "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    "width": 800,
    "height": 600,
    "format": "jpg",
}

CONFIGURED = {
    "CLOUD_NAME": "demo",
    "API_KEY": "key",
    "API_SECRET": "secret",
    "SECURE": True,
    "FOLDER": "sripon",
}

UNCONFIGURED = {
    "CLOUD_NAME": "",
    "API_KEY": "",
    "API_SECRET": "",
    "SECURE": True,
    "FOLDER": "sripon",
}


class StorageHelperTests(TestCase):
    def setUp(self):
        storage.reset_configuration()

    def tearDown(self):
        storage.reset_configuration()

    @override_settings(CLOUDINARY=CONFIGURED)
    @patch("cloudinary.uploader.upload", return_value=FakeResult)
    def test_upload_image_returns_normalised_payload(self, mock_upload):
        payload = storage.upload_image("file-bytes", folder="sripon/products/BB-1")
        self.assertEqual(payload["public_id"], FakeResult["public_id"])
        self.assertEqual(payload["secure_url"], FakeResult["secure_url"])
        self.assertEqual(payload["width"], 800)
        self.assertEqual(payload["format"], "jpg")
        self.assertEqual(mock_upload.call_args.kwargs["folder"], "sripon/products/BB-1")

    @override_settings(CLOUDINARY=UNCONFIGURED)
    def test_upload_image_without_credentials_raises(self):
        with self.assertRaises(storage.CloudinaryNotConfigured):
            storage.upload_image("file-bytes")

    @override_settings(CLOUDINARY=CONFIGURED)
    @patch("cloudinary.uploader.destroy")
    def test_delete_image_calls_destroy(self, mock_destroy):
        self.assertTrue(storage.delete_image("sripon/x"))
        mock_destroy.assert_called_once_with("sripon/x", invalidate=True)

    @override_settings(CLOUDINARY=UNCONFIGURED)
    def test_delete_image_skips_when_unconfigured(self):
        self.assertFalse(storage.delete_image("sripon/x"))

    @override_settings(CLOUDINARY=CONFIGURED)
    @patch("apps.common.storage.delete_image")
    def test_delete_payload_asset_reads_public_id(self, mock_delete):
        storage.delete_payload_asset({"public_id": "sripon/y"})
        mock_delete.assert_called_once_with("sripon/y")
        mock_delete.reset_mock()
        self.assertFalse(storage.delete_payload_asset(None))
        mock_delete.assert_not_called()

    @override_settings(CLOUDINARY=CONFIGURED)
    def test_build_url_applies_variant_transformation(self):
        card = storage.build_url("sripon/products/BB-1/sample", variant="card")
        self.assertIn("sripon/products/BB-1/sample", card)
        self.assertIn("w_400", card)
        self.assertIn("h_400", card)

    def test_build_url_without_public_id_is_empty(self):
        self.assertEqual(storage.build_url(""), "")

    @override_settings(CLOUDINARY={"CLOUD_NAME": "demo", "API_KEY": "", "API_SECRET": "", "SECURE": True, "FOLDER": "sripon"})
    def test_is_configured_requires_all_credentials(self):
        self.assertFalse(storage.is_configured())

    @override_settings(CLOUDINARY=CONFIGURED)
    def test_default_folder_appends_subfolder(self):
        self.assertEqual(storage.default_folder(), "sripon")
        self.assertEqual(storage.default_folder("/products/BB-1/"), "sripon/products/BB-1")
