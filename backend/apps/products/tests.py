from decimal import Decimal

from django.test import TestCase

from apps.categories.models import Category
from apps.products.models import (
    Inventory,
    InventoryTransaction,
    Product,
)
from apps.users.models import AdminUser


class ProductHelpersTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Firecrackers", slug="firecrackers")

    def test_effective_price_prefers_discount_price(self):
        product = Product.objects.create(
            category=self.category,
            sku="SKU-1",
            name="Big Bang",
            slug="big-bang",
            mrp=Decimal("100"),
            price=Decimal("90"),
            discount_price=Decimal("80"),
            tax=Decimal("18"),
        )
        self.assertEqual(product.effective_price, Decimal("80"))
        self.assertEqual(product.discount_amount, Decimal("20"))
        self.assertEqual(product.discount_percent, Decimal("20.00"))

    def test_discount_ignored_when_missing_or_above_price(self):
        product = Product.objects.create(
            category=self.category,
            sku="SKU-2",
            name="Whistler",
            slug="whistler",
            mrp=Decimal("50"),
            price=Decimal("40"),
            discount_price=Decimal("45"),
        )
        self.assertEqual(product.effective_price, Decimal("40"))
        self.assertEqual(product.discount_amount, Decimal("10"))

    def test_available_quantity_and_in_stock(self):
        product = Product.objects.create(
            category=self.category,
            sku="SKU-3",
            name="Sparkler Box",
            slug="sparkler-box",
            price=Decimal("10"),
            stock_quantity=10,
            reserved_quantity=4,
        )
        self.assertEqual(product.available_quantity, 6)
        self.assertTrue(product.in_stock)

    def test_out_of_stock_when_reserved_outweighs_stock(self):
        product = Product.objects.create(
            category=self.category,
            sku="SKU-4",
            name="Empty Box",
            slug="empty-box",
            price=Decimal("10"),
            stock_quantity=0,
        )
        self.assertEqual(product.available_quantity, 0)
        self.assertFalse(product.in_stock)

    def test_tax_amount(self):
        product = Product.objects.create(
            category=self.category,
            sku="SKU-5",
            name="Taxed",
            slug="taxed",
            price=Decimal("200"),
            discount_price=Decimal("100"),
            tax=Decimal("18"),
        )
        self.assertEqual(product.tax_amount, Decimal("18.00"))


class InventoryTests(TestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Rockets", slug="rockets")

    def test_ensure_for_product_and_sync(self):
        product = Product.objects.create(
            category=self.category,
            sku="INV-1",
            name="Rocket",
            slug="rocket",
            price=Decimal("25"),
            stock_quantity=8,
            reserved_quantity=0,
        )
        inventory = Inventory.ensure_for_product(product)
        self.assertEqual(inventory.available_quantity, 8)

        inventory.stock_quantity = 3
        inventory.save()
        inventory.sync_product_counts()
        product.refresh_from_db()
        self.assertEqual(product.stock_quantity, 3)
        self.assertTrue(inventory.is_low_stock)

    def test_transaction_audit_created(self):
        admin = AdminUser.objects.create(
            supabase_uid="uid-1",
            email="admin@sripon.in",
            name="Manager",
        )
        product = Product.objects.create(
            category=self.category,
            sku="INV-2",
            name="Audited",
            slug="audited",
            price=Decimal("5"),
        )
        InventoryTransaction.objects.create(
            product=product,
            quantity_change=20,
            reason=InventoryTransaction.Reason.PURCHASE,
            admin_user=admin,
            reference="RESTOCK-1",
        )
        transaction = InventoryTransaction.objects.get(reference="RESTOCK-1")
        self.assertEqual(transaction.quantity_change, 20)
        self.assertEqual(transaction.reason, InventoryTransaction.Reason.PURCHASE)