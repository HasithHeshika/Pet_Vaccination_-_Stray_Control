import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobileapp/screens/login_screen.dart';
import 'package:mobileapp/screens/signup_screen.dart';
import '../helpers/mock_api.dart';

Widget _app(Widget home) => MaterialApp(home: home);

// A tall phone so the whole form and its buttons are on screen
void _tallPhone(WidgetTester tester) {
  tester.view.physicalSize = const Size(1080, 4000);
  tester.view.devicePixelRatio = 2.5;
  addTearDown(tester.view.reset);
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('signup validators (same rules as the API)', () {
    test('email must be present and well-formed', () {
      expect(validateEmail(''), 'Required');
      expect(validateEmail('   '), 'Required');
      expect(validateEmail('kamal'), 'Enter a valid email address');
      expect(validateEmail('kamal@mail'), 'Enter a valid email address');
      expect(validateEmail('kamal @mail.com'), 'Enter a valid email address');
      expect(validateEmail(' kamal@mail.com '), isNull);
    });

    test('password must have at least 6 characters', () {
      expect(validatePassword(''), 'Required');
      expect(validatePassword('12345'), 'Password must be at least 6 characters');
      expect(validatePassword('123456'), isNull);
    });
  });

  group('SignupScreen', () {
    Future<void> submit(WidgetTester tester) async {
      final button = find.widgetWithText(ElevatedButton, 'Sign Up');
      await tester.ensureVisible(button);
      await tester.tap(button);
      await tester.pump();
    }

    Future<void> fill(WidgetTester tester, String label, String value) async {
      final field = find.widgetWithText(TextFormField, label);
      await tester.ensureVisible(field);
      await tester.enterText(field, value);
    }

    testWidgets('submitting an empty form flags every required field and sends nothing', (tester) async {
      final api = MockApi.json(201, {});
      await api.run(() async {
        _tallPhone(tester);
        await tester.pumpWidget(_app(const SignupScreen()));
        await submit(tester);
      });
      // All 9 text fields are required
      expect(find.text('Required'), findsNWidgets(9));
      expect(api.requests, isEmpty);
    });

    testWidgets('shows email and password-length errors before calling the API', (tester) async {
      final api = MockApi.json(201, {});
      await api.run(() async {
        _tallPhone(tester);
        await tester.pumpWidget(_app(const SignupScreen()));
        await fill(tester, 'Email *', 'not-an-email');
        await fill(tester, 'Password * (min 6 characters)', '123');
        await submit(tester);
      });
      expect(find.text('Enter a valid email address'), findsOneWidget);
      expect(find.text('Password must be at least 6 characters'), findsOneWidget);
      expect(api.requests, isEmpty);
    });

    testWidgets('mismatched passwords are caught on the device', (tester) async {
      final api = MockApi.json(201, {});
      await api.run(() async {
        _tallPhone(tester);
        await tester.pumpWidget(_app(const SignupScreen()));
        for (final entry in {
          'Full Name *': 'Kamal Perera',
          'Email *': 'kamal@example.com',
          'Password * (min 6 characters)': 'secret1',
          'Confirm Password *': 'secret2',
          'Phone Number *': '0771234567',
          'NIC Number *': '200012345678',
          'Street Address *': '1 Main St',
          'City *': 'Galle',
          'Postal Code *': '80000',
        }.entries) {
          await fill(tester, entry.key, entry.value);
        }
        await submit(tester);
      });
      expect(find.text('Passwords do not match'), findsOneWidget);
      expect(api.requests, isEmpty);
    });
  });

  group('LoginScreen', () {
    testWidgets('empty fields are rejected without calling the API', (tester) async {
      final api = MockApi.json(200, {});
      await api.run(() async {
        _tallPhone(tester);
        await tester.pumpWidget(_app(const LoginScreen()));
        await tester.tap(find.widgetWithText(ElevatedButton, 'LOGIN'));
        await tester.pump();
      });
      expect(find.text('Please fill all fields'), findsOneWidget);
      expect(api.requests, isEmpty);
    });

    testWidgets('a rejected login shows the server message', (tester) async {
      final api = MockApi.json(401, {'message': 'Invalid credentials'});
      await api.run(() async {
        _tallPhone(tester);
        await tester.pumpWidget(_app(const LoginScreen()));
        final fields = find.byType(TextField);
        await tester.enterText(fields.at(0), 'kamal@example.com');
        await tester.enterText(fields.at(1), 'wrongpass');
        await tester.tap(find.widgetWithText(ElevatedButton, 'LOGIN'));
        await tester.pumpAndSettle();
      });
      expect(api.requests.single.url.path, '/api/auth/login');
      expect(find.text('Invalid credentials'), findsOneWidget);
    });

    testWidgets('login and signup lay out on a 360dp phone without overflow', (tester) async {
      tester.view.physicalSize = const Size(1080, 1920);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      await tester.pumpWidget(_app(const LoginScreen()));
      await tester.pump();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(_app(const SignupScreen()));
      await tester.pump();
      expect(tester.takeException(), isNull);
    });

    testWidgets('the eye icon shows and hides the password', (tester) async {
      await tester.pumpWidget(_app(const LoginScreen()));
      TextField password() => tester.widget<TextField>(find.byType(TextField).at(1));
      expect(password().obscureText, isTrue);
      await tester.tap(find.byIcon(Icons.visibility_off_outlined));
      await tester.pump();
      expect(password().obscureText, isFalse);
    });
  });
}
