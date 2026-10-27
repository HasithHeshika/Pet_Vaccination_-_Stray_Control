import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_client.dart';

class LostAndFoundService {
  final ApiClient _client = ApiClient();

  Exception _error(http.Response response, String fallback) {
    String message = fallback;
    try {
      message = jsonDecode(response.body)['message'] ?? fallback;
    } catch (_) {}
    // The server's catch-all 404 means this app is newer than the server
    if (message == 'Route not found') {
      message = 'This feature is not available on the server yet. Please try again after the next server update.';
    }
    return Exception(message);
  }

  // type: 'lost', 'found' or null for all. Lists include only the first photo of each report.
  Future<List<dynamic>> getLostAndFoundList({String? type}) async {
    final response = await _client.get('/api/lost-and-found${type != null ? '?type=$type' : ''}');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw _error(response, 'Failed to load lost and found reports');
  }

  Future<Map<String, dynamic>> getLostAndFoundById(String id) async {
    final response = await _client.get('/api/lost-and-found/$id');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw _error(response, 'Failed to load the report');
  }

  // data['reportType'] is 'lost' or 'found'
  Future<Map<String, dynamic>> reportLost(Map<String, dynamic> data) async {
    final response = await _client.post('/api/lost-and-found', body: data);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw _error(response, 'Failed to submit the report');
  }

  Future<Map<String, dynamic>> updateLostAndFound(String id, Map<String, dynamic> data) async {
    final response = await _client.put('/api/lost-and-found/$id', body: data);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw _error(response, 'Failed to update the report');
  }

  Future<Map<String, dynamic>> updateStatus(String id, String status) async {
    final response = await _client.patch('/api/lost-and-found/$id/status', body: {'status': status});
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw _error(response, 'Failed to update status');
  }

  Future<void> deleteLostAndFound(String id) async {
    final response = await _client.delete('/api/lost-and-found/$id');
    if (response.statusCode != 200) {
      throw _error(response, 'Failed to delete the report');
    }
  }

  // Matches the authority has confirmed for my reports or registered pets
  Future<List<dynamic>> getMyMatches() async {
    final response = await _client.get('/api/matches/mine');
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      return decoded is Map && decoded['matches'] is List ? decoded['matches'] : [];
    }
    throw _error(response, 'Failed to load your matches');
  }
}
