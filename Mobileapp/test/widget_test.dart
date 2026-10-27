// App-level smoke tests: the app starts on the splash screen and routes by the saved session.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobileapp/main.dart';
import 'package:mobileapp/screens/get_started_screen.dart';
import 'package:mobileapp/screens/login_screen.dart';

void main() {
  setUp(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('first launch shows the splash screen, then onboarding', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const MyApp());
    expect(find.byType(MaterialApp), findsOneWidget);

    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
    expect(find.byType(GetStartedScreen), findsOneWidget);
  });

  testWidgets('returning user without a session goes to the login screen', (tester) async {
    SharedPreferences.setMockInitialValues({'hasSeenOnboarding': true});
    await tester.pumpWidget(const MyApp());
    await tester.pump(const Duration(seconds: 3));
    await tester.pumpAndSettle();
    expect(find.byType(LoginScreen), findsOneWidget);
  });
}
