import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:sripon/main.dart';
import 'package:sripon/models/cart.dart';
import 'package:sripon/models/category.dart';
import 'package:sripon/models/order.dart';
import 'package:sripon/models/product.dart';
import 'package:sripon/providers/app_providers.dart';
import 'package:sripon/repositories/cart_repository.dart';
import 'package:sripon/repositories/catalogue_repository.dart';
import 'package:sripon/repositories/order_repository.dart';

/// Repository fakes that resolve instantly with static data so widget tests
/// never touch the network or hold pending timers. They are injected as
/// [ProviderScope] overrides around [SriPonApp].
final _overrides = [
  catalogueRepositoryProvider.overrideWithValue(_FakeCatalogueRepository()),
  cartRepositoryProvider.overrideWithValue(_FakeCartRepository()),
  orderRepositoryProvider.overrideWithValue(_FakeOrderRepository()),
];

Widget _app() => ProviderScope(overrides: _overrides, child: const SriPonApp());

void main() {
  testWidgets('SriPon app boots with the shell navigation', (tester) async {
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    // All five primary destinations are rendered.
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Categories'), findsWidgets);
    expect(find.text('Search'), findsWidgets);
    expect(find.text('Cart'), findsWidgets);
    expect(find.text('Profile'), findsWidgets);
  });

  testWidgets('navigating between tabs swaps the visible screen', (tester) async {
    await tester.pumpWidget(_app());
    await tester.pumpAndSettle();

    // Home tab: catalogue renders an empty-state once data loads.
    expect(find.text('SriPon'), findsOneWidget);

    // Categories tab shows its app bar.
    await tester.tap(find.text('Categories'));
    await tester.pumpAndSettle();
    expect(find.widgetWithText(AppBar, 'Categories'), findsOneWidget);

    // Cart tab has its app bar and empty message.
    await tester.tap(find.text('Cart'));
    await tester.pumpAndSettle();
    expect(find.text('Your cart is empty.\nBrowse products and add items to get started.'),
        findsOneWidget);
  });
}

class _FakeCatalogueRepository extends CatalogueRepository {
  @override
  Future<List<Product>> getProducts(
      {int page = 1, String? search, int? categoryId}) async {
    return [];
  }

  @override
  Future<List<Category>> getCategories() async => [];
}

class _FakeCartRepository extends CartRepository {
  @override
  Future<Cart> getCart() async =>
      const Cart(items: [], itemCount: 0, subtotal: '0', total: '0');
}

class _FakeOrderRepository extends OrderRepository {
  @override
  Future<List<OrderSummary>> getOrders() async => [];
}