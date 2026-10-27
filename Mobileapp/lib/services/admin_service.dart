import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

// Admin / municipal authority API calls (the same endpoints the web admin pages use)
class AdminService {
  final ApiClient _client = ApiClient();

  dynamic _decode(http.Response response, String fallbackMessage, {List<int> ok = const [200]}) {
    dynamic body;
    try {
      body = jsonDecode(response.body);
    } catch (_) {
      body = null;
    }
    if (ok.contains(response.statusCode)) return body;
    // The server's catch-all 404 means this app is newer than the server
    if (body is Map && body['message'] == 'Route not found') {
      throw Exception('This feature is not available on the server yet. Please try again after the next server update.');
    }
    final message = body is Map && body['message'] != null ? body['message'].toString() : fallbackMessage;
    throw Exception(message);
  }

  List<dynamic> _list(dynamic body, String key) {
    if (body is List) return body;
    if (body is Map && body[key] is List) return body[key];
    return [];
  }

  // ---- Overview ----
  Future<Map<String, dynamic>> getAuthorityDashboard() async {
    final body = _decode(await _client.get('/api/authority/dashboard'), 'Failed to load the dashboard');
    return Map<String, dynamic>.from(body);
  }

  // ---- Users ----
  Future<List<dynamic>> getUsers() async =>
      _list(_decode(await _client.get('/api/users'), 'Failed to load users'), 'users');

  Future<String> verifyUser(String userId) async {
    final body = _decode(await _client.patch('/api/users/$userId/verify'), 'Failed to verify user');
    return (body?['message'] ?? 'User verified').toString();
  }

  Future<String> sendPasswordReset(String userId) async {
    final body = _decode(await _client.post('/api/users/$userId/send-password-reset'), 'Failed to send the reset link');
    return (body?['message'] ?? 'Reset link sent').toString();
  }

  // ---- Pets ----
  Future<List<dynamic>> getAllPets() async =>
      _list(_decode(await _client.get('/api/pets'), 'Failed to load pets'), 'pets');

  Future<Map<String, dynamic>> registerPet(Map<String, dynamic> data) async {
    final body = _decode(await _client.post('/api/pets/register', body: data), 'Failed to register the pet', ok: [200, 201]);
    return Map<String, dynamic>.from(body?['pet'] ?? {});
  }

  // ---- Vaccinations ----
  Future<List<dynamic>> getPetVaccinations(String petMongoId) async =>
      _list(_decode(await _client.get('/api/vaccinations/pet/$petMongoId'), 'Failed to load vaccinations'), 'vaccinations');

  Future<void> addVaccination(Map<String, dynamic> data) async {
    _decode(await _client.post('/api/vaccinations', body: data), 'Failed to add the vaccination', ok: [200, 201]);
  }

  Future<void> deleteVaccination(String vaccinationId) async {
    _decode(await _client.delete('/api/vaccinations/$vaccinationId'), 'Failed to delete the vaccination');
  }

  // ---- Breeder licences ----
  Future<List<dynamic>> getLicenses() async =>
      _list(_decode(await _client.get('/api/licenses'), 'Failed to load licence applications'), 'licenses');

  Future<Map<String, dynamic>> getLicense(String id) async =>
      Map<String, dynamic>.from(_decode(await _client.get('/api/licenses/$id'), 'Failed to load the application'));

  Future<void> updateLicenseStatus(String id, String status, String remarks) async {
    _decode(
      await _client.put('/api/licenses/$id/status', body: {'status': status, 'remarks': remarks}),
      'Failed to update the licence',
    );
  }

  // ---- Animal incident reports ----
  Future<List<dynamic>> getIncidents() async =>
      _list(_decode(await _client.get('/api/stray-reports'), 'Failed to load incident reports'), 'reports');

  Future<Map<String, dynamic>> getIncident(String id) async {
    final body = _decode(await _client.get('/api/stray-reports/$id'), 'Failed to load the report');
    return Map<String, dynamic>.from(body?['report'] ?? {});
  }

  Future<void> updateIncidentStatus(String id, String status) async {
    _decode(await _client.patch('/api/stray-reports/$id/status', body: {'status': status}), 'Failed to update the report');
  }

  // ---- Lost & Found matches ----
  // Returns {matches: [...], counts: {suggested, confirmed, rejected}}
  Future<Map<String, dynamic>> getMatches(String status) async =>
      Map<String, dynamic>.from(_decode(await _client.get('/api/matches?status=$status'), 'Failed to load matches') ?? {});

  Future<Map<String, dynamic>> getMatch(String id) async {
    final body = _decode(await _client.get('/api/matches/$id'), 'Failed to load the match');
    return Map<String, dynamic>.from(body?['match'] ?? {});
  }

  // decision: 'confirm' or 'reject'
  Future<String> reviewMatch(String id, String decision, String note) async {
    final body = _decode(
      await _client.patch('/api/matches/$id', body: {'decision': decision, if (note.isNotEmpty) 'note': note}),
      'Failed to save the decision',
    );
    return (body?['message'] ?? 'Saved').toString();
  }

  Future<String> rerunMatching(String reportId) async {
    final body = _decode(await _client.post('/api/matches/rerun/$reportId'), 'Failed to re-run matching');
    return (body?['message'] ?? 'Matching re-run').toString();
  }
}
