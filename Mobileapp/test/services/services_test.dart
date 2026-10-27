import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobileapp/services/admin_service.dart';
import 'package:mobileapp/services/api_client.dart';
import 'package:mobileapp/services/auth_service.dart';
import 'package:mobileapp/services/lost_and_found_service.dart';
import 'package:mobileapp/services/user_service.dart';
import '../helpers/mock_api.dart';

const _friendly404 = 'This feature is not available on the server yet. Please try again after the next server update.';

Matcher _throwsMessage(String message) =>
    throwsA(isA<Exception>().having((e) => e.toString(), 'message', 'Exception: $message'));

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  group('ApiClient', () {
    test('calls the production API with JSON headers and no token when logged out', () async {
      final api = MockApi.json(200, {});
      await api.run(() => ApiClient().get('/api/health'));
      final r = api.requests.single;
      expect(r.url.toString(), '${ApiClient.baseUrl}/api/health');
      expect(r.headers['Content-Type'], startsWith('application/json'));
      expect(r.headers.containsKey('Authorization'), isFalse);
    });

    test('sends the saved token as a Bearer header and encodes the body as JSON', () async {
      SharedPreferences.setMockInitialValues({'token': 'abc123'});
      final api = MockApi.json(200, {});
      await api.run(() => ApiClient().post('/api/x', body: {'a': 1}));
      final r = api.requests.single;
      expect(r.method, 'POST');
      expect(r.headers['Authorization'], 'Bearer abc123');
      expect(jsonDecode(r.body), {'a': 1});
    });
  });

  group('AuthService', () {
    test('effectiveRole: isAdmin wins, otherwise the role, defaulting to user', () {
      expect(AuthService.effectiveRole(null), 'user');
      expect(AuthService.effectiveRole({'role': 'user', 'isAdmin': true}), 'admin');
      expect(AuthService.effectiveRole({'role': 'veterinarian'}), 'veterinarian');
      expect(AuthService.effectiveRole({}), 'user');
    });

    test('login saves token, user id and the effective role', () async {
      final api = MockApi.json(200, {
        'token': 'jwt-token',
        'user': {'id': 'u1', 'role': 'user', 'isAdmin': true}
      });
      final data = await api.run(() => AuthService().login('a@b.com', 'secret1'));
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('token'), 'jwt-token');
      expect(prefs.getString('userId'), 'u1');
      expect(prefs.getString('role'), 'admin');
      expect(data!['user']['role'], 'admin');
      expect(jsonDecode(api.requests.single.body), {'email': 'a@b.com', 'password': 'secret1'});
    });

    test('login failure shows the server message', () async {
      final api = MockApi.json(401, {'message': 'Invalid credentials'});
      expect(api.run(() => AuthService().login('a@b.com', 'wrong')), _throwsMessage('Invalid credentials'));
    });

    test('signup failure shows the server message, not the raw JSON body', () async {
      final api = MockApi.json(400, {'message': 'User with this email or NIC already exists'});
      expect(api.run(() => AuthService().signup({})), _throwsMessage('User with this email or NIC already exists'));
    });

    test('signup validation errors show the first field error', () async {
      final api = MockApi.json(400, {
        'errors': [
          {'msg': 'Password must be at least 6 characters', 'path': 'password'}
        ]
      });
      expect(api.run(() => AuthService().signup({})), _throwsMessage('Password must be at least 6 characters'));
    });

    test('signup with a non-JSON error falls back to a readable message', () async {
      final api = MockApi((_) => http.Response('<html>502 Bad Gateway</html>', 502));
      expect(api.run(() => AuthService().signup({})), _throwsMessage('Failed to sign up. Please try again.'));
    });

    test('logout clears the saved session', () async {
      SharedPreferences.setMockInitialValues({'token': 't', 'userId': 'u', 'role': 'admin', 'hasSeenOnboarding': true});
      await AuthService().logout();
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getString('token'), isNull);
      expect(prefs.getString('userId'), isNull);
      expect(prefs.getString('role'), isNull);
      expect(prefs.getBool('hasSeenOnboarding'), isTrue);
    });
  });

  group('LostAndFoundService', () {
    test('filters the feed by report type', () async {
      final api = MockApi.json(200, [
        {'_id': 'r1', 'reportType': 'found'}
      ]);
      final list = await api.run(() => LostAndFoundService().getLostAndFoundList(type: 'found'));
      expect(api.requests.single.url.path, '/api/lost-and-found');
      expect(api.requests.single.url.queryParameters, {'type': 'found'});
      expect(list, hasLength(1));
    });

    test('reportLost accepts 201 Created', () async {
      final api = MockApi.json(201, {'_id': 'new'});
      final created = await api.run(() => LostAndFoundService().reportLost({'reportType': 'lost'}));
      expect(created['_id'], 'new');
    });

    test('errors show the server message', () async {
      final api = MockApi.json(400, {'message': 'Species is required'});
      expect(api.run(() => LostAndFoundService().reportLost({})), _throwsMessage('Species is required'));
    });

    test('errors without a JSON body use the fallback message', () async {
      final api = MockApi((_) => http.Response('Service Unavailable', 503));
      expect(api.run(() => LostAndFoundService().getLostAndFoundList()), _throwsMessage('Failed to load lost and found reports'));
    });

    test('an outdated server ("Route not found") gets a friendly message', () async {
      final api = MockApi.json(404, {'message': 'Route not found'});
      expect(api.run(() => LostAndFoundService().getMyMatches()), _throwsMessage(_friendly404));
    });

    test('getMyMatches unwraps the matches list and tolerates other shapes', () async {
      final ok = MockApi.json(200, {
        'matches': [
          {'_id': 'm1', 'role': 'owner'}
        ]
      });
      expect(await ok.run(() => LostAndFoundService().getMyMatches()), hasLength(1));
      final odd = MockApi.json(200, []);
      expect(await odd.run(() => LostAndFoundService().getMyMatches()), isEmpty);
    });
  });

  group('AdminService', () {
    test('getMatches requests the chosen status and returns matches and counts', () async {
      final api = MockApi.json(200, {
        'matches': [],
        'counts': {'suggested': 3}
      });
      final data = await api.run(() => AdminService().getMatches('confirmed'));
      expect(api.requests.single.url.queryParameters, {'status': 'confirmed'});
      expect(data['counts'], {'suggested': 3});
    });

    test('reviewMatch sends the decision and omits an empty note', () async {
      final api = MockApi.json(200, {'message': 'Match rejected'});
      final message = await api.run(() => AdminService().reviewMatch('m1', 'reject', ''));
      expect(message, 'Match rejected');
      expect(api.requests.single.method, 'PATCH');
      expect(api.requests.single.url.path, '/api/matches/m1');
      expect(jsonDecode(api.requests.single.body), {'decision': 'reject'});
    });

    test('reviewMatch includes the note when given', () async {
      final api = MockApi.json(200, {'message': 'ok'});
      await api.run(() => AdminService().reviewMatch('m1', 'confirm', 'Same white patch'));
      expect(jsonDecode(api.requests.single.body), {'decision': 'confirm', 'note': 'Same white patch'});
    });

    test('server errors surface the API message', () async {
      final api = MockApi.json(400, {'message': 'This match has already been confirmed'});
      expect(api.run(() => AdminService().reviewMatch('m1', 'confirm', '')), _throwsMessage('This match has already been confirmed'));
    });

    test('an outdated server ("Route not found") gets a friendly message', () async {
      final api = MockApi.json(404, {'message': 'Route not found'});
      expect(api.run(() => AdminService().getMatches('suggested')), _throwsMessage(_friendly404));
    });

    test('a 403 for non-admins is reported, not swallowed', () async {
      final api = MockApi.json(403, {'message': 'Access denied. Admin only.'});
      expect(api.run(() => AdminService().getUsers()), _throwsMessage('Access denied. Admin only.'));
    });

    test('list endpoints accept both bare arrays and wrapped objects', () async {
      final bare = MockApi.json(200, [
        {'_id': 'u1'}
      ]);
      expect(await bare.run(() => AdminService().getUsers()), hasLength(1));
      final wrapped = MockApi.json(200, {
        'users': [
          {'_id': 'u1'},
          {'_id': 'u2'}
        ]
      });
      expect(await wrapped.run(() => AdminService().getUsers()), hasLength(2));
    });
  });

  group('UserService.changePassword', () {
    test('keeps the session alive by saving the new token from the server', () async {
      SharedPreferences.setMockInitialValues({'token': 'old-token'});
      final api = MockApi.json(200, {'message': 'Password changed successfully', 'token': 'new-token'});
      await api.run(() => UserService().changePassword('Passw0rd!', 'NewPassw0rd!'));
      expect(api.requests.single.headers['Authorization'], 'Bearer old-token');
      expect(jsonDecode(api.requests.single.body), {'currentPassword': 'Passw0rd!', 'newPassword': 'NewPassw0rd!'});
      expect((await SharedPreferences.getInstance()).getString('token'), 'new-token');
    });

    test('shows the server reason when the current password is wrong', () async {
      final api = MockApi.json(400, {'message': 'Current password is incorrect'});
      expect(api.run(() => UserService().changePassword('wrong', 'NewPassw0rd!')), _throwsMessage('Current password is incorrect'));
    });
  });
}
