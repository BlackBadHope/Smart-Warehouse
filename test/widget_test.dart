// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:inventory_os_flutter/main.dart';

void main() {
  testWidgets('Inventory app starts', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const InventoryApp());

    // Wait for async initialization with longer timeout
    await tester.pumpAndSettle(const Duration(seconds: 3));

    // Verify that the app starts with the warehouse list screen
    expect(find.text('Inventory OS'), findsOneWidget);
    
    // Check for either loading indicator or empty state
    final hasLoading = find.byType(CircularProgressIndicator).evaluate().isNotEmpty;
    final hasEmptyState = find.text('Нет складов').evaluate().isNotEmpty;
    
    expect(hasLoading || hasEmptyState, isTrue);
  });
}
