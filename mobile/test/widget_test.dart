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

    // Switching tabs changes the visible screen.
    await tester.tap(find.text('Cart'));
    await tester.pumpAndSettle();
    expect(find.text('Your cart and quantities appear here.'), findsOneWidget);
  });
}