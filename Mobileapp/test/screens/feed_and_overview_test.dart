import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobileapp/screens/admin/admin_overview_tab.dart';
import 'package:mobileapp/screens/lost_found_screen.dart';
import '../helpers/mock_api.dart';
import 'dart:convert';

Widget _app(Widget home) => MaterialApp(home: home);

final _reports = [
  {
    '_id': 'r1',
    'reportType': 'lost',
    'status': 'In Progress',
    'petName': 'Rex',
    'species': 'Dog',
    'breed': 'Labrador',
    'color': 'black',
    'lastSeenLocation': 'Galle Fort',
    'lastSeenDate': '2026-10-20',
    'contactInfo': '0771234567',
    'reportedBy': {'_id': 'me', 'fullName': 'Kamal'},
  },
  {
    '_id': 'r2',
    'reportType': 'found',
    'status': 'Found',
    'petName': 'Unknown',
    'species': 'Cat',
    'color': 'white',
    'lastSeenLocation': 'Matara bus stand',
    'lastSeenDate': '2026-10-21',
    'contactInfo': 'nimal@example.com',
    'reportedBy': 'someone-else',
  },
];

MockApi _feedApi() => MockApi((request) {
      if (request.url.path == '/api/lost-and-found') return http.Response(jsonEncode(_reports), 200);
      return http.Response(jsonEncode({'matches': []}), 200);
    });

void main() {
  group('Lost & Found feed', () {
    setUp(() => SharedPreferences.setMockInitialValues({'userId': 'me'}));

    Future<void> pumpFeed(WidgetTester tester, MockApi api) => api.run(() async {
          tester.view.physicalSize = const Size(1080, 4000);
          tester.view.devicePixelRatio = 2.5;
          addTearDown(tester.view.reset);
          await tester.pumpWidget(_app(const LostFoundScreen()));
          await tester.pumpAndSettle();
        });

    testWidgets('badges come from reportType: an In Progress lost report is LOST, not FOUND', (tester) async {
      await pumpFeed(tester, _feedApi());
      expect(find.text('LOST'), findsOneWidget);
      expect(find.text('FOUND'), findsOneWidget);
      expect(find.text('IN PROGRESS'), findsOneWidget);
      expect(find.text('Rex'), findsOneWidget);
      expect(find.text('Unknown name'), findsOneWidget);
    });

    testWidgets('the Found tab shows only found reports', (tester) async {
      final api = _feedApi();
      await pumpFeed(tester, api);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Found'));
      await tester.pumpAndSettle();
      expect(find.text('Rex'), findsNothing);
      expect(find.text('Unknown name'), findsOneWidget);
    });

    testWidgets('Mine shows my reports with a "Mark resolved" action', (tester) async {
      final api = _feedApi();
      await pumpFeed(tester, api);
      await tester.tap(find.widgetWithText(ChoiceChip, 'Mine'));
      await tester.pumpAndSettle();
      expect(find.text('Rex'), findsOneWidget);
      expect(find.text('Unknown name'), findsNothing);
      expect(find.text('Mark resolved (reunited)'), findsOneWidget);
    });

    testWidgets('Contact shows the reporter\'s contact details', (tester) async {
      final api = _feedApi();
      await pumpFeed(tester, api);
      await tester.tap(find.text('Contact Finder'));
      await tester.pumpAndSettle();
      expect(find.text('Contact the finder'), findsOneWidget);
      expect(find.text('nimal@example.com'), findsOneWidget);
    });

    testWidgets('My matches shows an explanation when nothing is confirmed yet', (tester) async {
      final api = _feedApi();
      await pumpFeed(tester, api);
      await api.run(() async {
        // The chip row scrolls sideways; bring the last chip into view first
        await tester.ensureVisible(find.widgetWithText(ChoiceChip, 'My matches'));
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(ChoiceChip, 'My matches'));
        await tester.pumpAndSettle();
      });
      expect(find.textContaining('No confirmed matches yet'), findsOneWidget);
    });
  });

  group('Admin overview', () {
    setUp(() => SharedPreferences.setMockInitialValues({'token': 't'}));

    testWidgets('shows metrics and a banner for matches awaiting review', (tester) async {
      final api = MockApi.json(200, {
        'metrics': {
          'totalRegisteredPets': 42,
          'vaccinationComplianceRate': 75,
          'pendingMatches': 2,
          'openUrgentIncidents': 1,
          'pendingLicenseRequests': 0,
        }
      });
      await api.run(() async {
        tester.view.physicalSize = const Size(1080, 4000);
        tester.view.devicePixelRatio = 2.5;
        addTearDown(tester.view.reset);
        await tester.pumpWidget(_app(Scaffold(body: AdminOverviewTab(onOpenTab: (_) {}))));
        await tester.pumpAndSettle();
      });
      expect(api.requests.single.url.path, '/api/authority/dashboard');
      expect(find.text('42'), findsOneWidget);
      expect(find.text('75%'), findsOneWidget);
      expect(find.text('2 possible lost & found matches to review'), findsOneWidget);
      expect(find.text('1 open urgent or emergency animal incident'), findsOneWidget);
      expect(find.textContaining('breeder licence application'), findsNothing);
    });

    testWidgets('banner taps open the right tab', (tester) async {
      final opened = <int>[];
      final api = MockApi.json(200, {
        'metrics': {'openUrgentIncidents': 3}
      });
      await api.run(() async {
        await tester.pumpWidget(_app(Scaffold(body: AdminOverviewTab(onOpenTab: opened.add))));
        await tester.pumpAndSettle();
      });
      await tester.tap(find.text('3 open urgent or emergency animal incidents'));
      expect(opened, [4]);
    });
  });
}
