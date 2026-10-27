import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobileapp/screens/admin/admin_matches_screen.dart';
import 'package:mobileapp/screens/report_lost_screen.dart';
import '../helpers/mock_api.dart';

Widget _app(Widget home) => MaterialApp(home: home);

Map<String, dynamic> _match({String id = 'm1', int score = 87}) => {
      '_id': id,
      'status': 'suggested',
      'candidateType': 'lost_report',
      'score': score,
      'found': {'_id': 'f1', 'reportType': 'found', 'species': 'Dog', 'breed': 'Labrador', 'color': 'black', 'date': '2026-10-20', 'images': []},
      'lost': {'_id': 'l1', 'reportType': 'lost', 'petName': 'Rex', 'species': 'Dog', 'images': []},
    };

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('ReportLostScreen', () {
    testWidgets('a lost report asks for the pet name and hides the QR tag field', (tester) async {
      await tester.pumpWidget(_app(const ReportLostScreen()));
      await tester.pump();
      expect(find.text('Report a Missing Pet'), findsOneWidget);
      expect(find.text('Pet name *'), findsOneWidget);
      expect(find.text('Breed *'), findsOneWidget);
      expect(find.text('Last seen location *'), findsOneWidget);
      expect(find.text('Pet ID on the QR tag (if any)'), findsNothing);
    });

    testWidgets('switching to "I found a pet" makes name/breed optional and shows the QR tag field', (tester) async {
      await tester.pumpWidget(_app(const ReportLostScreen()));
      await tester.pump();
      await tester.tap(find.text('I FOUND A PET'));
      await tester.pump();
      expect(find.text('Report a Found Pet'), findsOneWidget);
      expect(find.text('Name on collar (if any)'), findsOneWidget);
      expect(find.text('Breed (if known)'), findsOneWidget);
      expect(find.text('Where did you find it? *'), findsOneWidget);
      expect(find.text('Date found *'), findsOneWidget);
      expect(find.text('Pet ID on the QR tag (if any)'), findsOneWidget);
    });

    testWidgets('opening with initialType "found" preselects a found report', (tester) async {
      await tester.pumpWidget(_app(const ReportLostScreen(initialType: 'found')));
      await tester.pump();
      expect(find.text('Report a Found Pet'), findsOneWidget);
    });

    testWidgets('submitting without required fields is blocked on the device', (tester) async {
      final api = MockApi.json(201, {});
      await api.run(() async {
        await tester.pumpWidget(_app(const ReportLostScreen()));
        await tester.pump();
        final submit = find.text('Submit Report');
        await tester.ensureVisible(submit);
        await tester.tap(submit);
        await tester.pump();
      });
      expect(find.text('Please fill all required fields'), findsOneWidget);
      expect(api.requests.where((r) => r.method == 'POST'), isEmpty);
    });
  });

  group('AdminMatchesScreen', () {
    testWidgets('lists suggested matches with score and counts', (tester) async {
      final api = MockApi.json(200, {
        'matches': [_match()],
        'counts': {'suggested': 1, 'confirmed': 4}
      });
      await api.run(() async {
        await tester.pumpWidget(_app(const AdminMatchesScreen()));
        await tester.pumpAndSettle();
      });
      expect(api.requests.first.url.queryParameters, {'status': 'suggested'});
      expect(find.text('Suggested (1)'), findsOneWidget);
      expect(find.text('Confirmed (4)'), findsOneWidget);
      expect(find.text('Rejected (0)'), findsOneWidget);
      expect(find.text('Score 87 / 100'), findsOneWidget);
      expect(find.text('Found vs lost "Rex"'), findsOneWidget);
    });

    testWidgets('choosing another status reloads that list', (tester) async {
      final api = MockApi.json(200, {'matches': [], 'counts': {}});
      await api.run(() async {
        await tester.pumpWidget(_app(const AdminMatchesScreen()));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Confirmed (0)'));
        await tester.pumpAndSettle();
      });
      expect(api.requests.last.url.queryParameters, {'status': 'confirmed'});
      expect(find.text('No confirmed matches.'), findsOneWidget);
    });

    testWidgets('an empty suggested list shows a helpful message', (tester) async {
      final api = MockApi.json(200, {'matches': [], 'counts': {}});
      await api.run(() async {
        await tester.pumpWidget(_app(const AdminMatchesScreen()));
        await tester.pumpAndSettle();
      });
      expect(find.text('No possible matches to review right now.'), findsOneWidget);
    });

    testWidgets('an outdated server shows a friendly error, not "Route not found"', (tester) async {
      final api = MockApi.json(404, {'message': 'Route not found'});
      await api.run(() async {
        await tester.pumpWidget(_app(const AdminMatchesScreen()));
        await tester.pumpAndSettle();
      });
      expect(find.textContaining('not available on the server yet'), findsOneWidget);
      expect(find.text('Route not found'), findsNothing);
      expect(find.text('Try again'), findsOneWidget);
    });

    testWidgets('status chips fit on a narrow phone without overflowing', (tester) async {
      tester.view.physicalSize = const Size(320 * 3, 640 * 3);
      tester.view.devicePixelRatio = 3;
      addTearDown(tester.view.reset);
      final api = MockApi.json(200, {'matches': [], 'counts': {'suggested': 12, 'confirmed': 30, 'rejected': 7}});
      await api.run(() async {
        await tester.pumpWidget(_app(const AdminMatchesScreen()));
        await tester.pumpAndSettle();
      });
      expect(tester.takeException(), isNull);
      expect(find.text('Rejected (7)'), findsOneWidget);
    });
  });
}
