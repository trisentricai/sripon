import 'package:flutter_test/flutter_test.dart';

import 'package:sripon/main.dart';

void main() {
  testWidgets('SriPon app boots with the shell navigation', (tester) async {
    await tester.pumpWidget(const SriPonApp());

    // All five primary destinations are rendered.
    expect(find.text('Home'), findsWidgets);
    expect(find.text('Categories'), findsWidgets);
    expect(find.text('Search'), findsWidgets);
    expect(find.text('Cart'), findsWidgets);
    expect(find.text('Profile'), findsWidgets);
  });

  testWidgets('navigating between tabs swaps the visible screen', (
      tester) async {
    await tester.pumpWidget(const SriPonApp());

    const expectations = <String, String>{
      'Cart': 'Your cart and quantities appear here.',
      'Profile': 'Account, orders, addresses and settings land here.',
      'Search': 'Search products, filters and suggestions land here.',
      'Categories': 'Nested cracker categories render here from the API.',
      'Home': 'Hero banners, featured products and offers load here from the API.',
    };

    for (final entry in expectations.entries) {
      await tester.tap(find.text(entry.key));
      await tester.pumpAndSettle();
      expect(find.text(entry.value), findsOneWidget,
          reason: 'Expected ${entry.key} tab to show its placeholder.');
    }
  });
}