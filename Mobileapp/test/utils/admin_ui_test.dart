import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobileapp/utils/admin_ui.dart';

// 1x1 transparent PNG
const _png =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

Widget _wrap(Widget child) => MaterialApp(home: Scaffold(body: child));

void main() {
  group('shortDate', () {
    test('formats an ISO date as dd/mm/yyyy', () {
      expect(shortDate('2026-03-07'), '07/03/2026');
    });
    test('accepts a DateTime value', () {
      expect(shortDate(DateTime(2025, 12, 31)), '31/12/2025');
    });
    test('returns "-" for null or unparseable values', () {
      expect(shortDate(null), '-');
      expect(shortDate('not a date'), '-');
      expect(shortDate(''), '-');
    });
  });

  group('errorText', () {
    test('strips the "Exception: " prefix', () {
      expect(errorText(Exception('Match not found')), 'Match not found');
    });
    test('leaves other errors unchanged', () {
      expect(errorText(StateError('bad state')), 'Bad state: bad state');
    });
  });

  group('sourceImage', () {
    testWidgets('renders a base64 data URL from memory', (tester) async {
      await tester.pumpWidget(_wrap(sourceImage(_png, size: 40)));
      final image = tester.widget<Image>(find.byType(Image));
      expect(image.image, isA<MemoryImage>());
      expect(image.width, 40);
    });

    testWidgets('renders an http(s) link from the network', (tester) async {
      await tester.pumpWidget(_wrap(sourceImage('https://example.com/dog.jpg')));
      expect(tester.widget<Image>(find.byType(Image)).image, isA<NetworkImage>());
    });

    testWidgets('shows a placeholder for unsupported sources', (tester) async {
      await tester.pumpWidget(_wrap(sourceImage('ftp://example.com/x.png')));
      expect(find.byIcon(Icons.broken_image), findsOneWidget);
      expect(find.byType(Image), findsNothing);
    });

    testWidgets('shows a placeholder for a corrupt data URL instead of crashing', (tester) async {
      await tester.pumpWidget(_wrap(sourceImage('data:image/png;base64,@@@not-base64@@@')));
      expect(find.byIcon(Icons.broken_image), findsOneWidget);
    });
  });

  group('StatusChip', () {
    testWidgets('shows its label', (tester) async {
      await tester.pumpWidget(_wrap(const StatusChip('APPROVED', Colors.green)));
      expect(find.text('APPROVED'), findsOneWidget);
    });
  });

  group('AdminListState', () {
    Future<void> pumpState(WidgetTester tester, {bool loading = false, String? error, bool isEmpty = false, VoidCallback? onRetry}) {
      return tester.pumpWidget(_wrap(AdminListState(
        loading: loading,
        error: error,
        isEmpty: isEmpty,
        emptyText: 'Nothing here',
        onRefresh: () async => onRetry?.call(),
        child: ListView(children: const [Text('row 1')]),
      )));
    }

    testWidgets('shows a spinner while loading', (tester) async {
      await pumpState(tester, loading: true);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('row 1'), findsNothing);
    });

    testWidgets('shows the error and a working "Try again" button', (tester) async {
      var retried = 0;
      await pumpState(tester, error: 'Server unavailable', onRetry: () => retried++);
      expect(find.text('Server unavailable'), findsOneWidget);
      await tester.tap(find.text('Try again'));
      expect(retried, 1);
    });

    testWidgets('shows the empty text without a retry button', (tester) async {
      await pumpState(tester, isEmpty: true);
      expect(find.text('Nothing here'), findsOneWidget);
      expect(find.text('Try again'), findsNothing);
    });

    testWidgets('shows the list when there is data', (tester) async {
      await pumpState(tester);
      expect(find.text('row 1'), findsOneWidget);
    });
  });
}
