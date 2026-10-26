import 'dart:convert';
import 'api_client.dart';

class StrayService {
  final ApiClient _client = ApiClient();

  Future<Map<String, dynamic>> reportStray(Map<String, dynamic> data) async {
    final response = await _client.post('/api/stray-reports', body: data);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    String message = 'Failed to send the report';
    try {
      message = jsonDecode(response.body)['message'] ?? message;
    } catch (_) {}
    throw Exception(message);
  }

  Future<List<dynamic>> getStrayReports() async {
    final response = await _client.get('/api/stray-reports');
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      if (decoded is List) return decoded;
      if (decoded is Map && decoded['reports'] is List) return decoded['reports'];
      return [];
    }
    throw Exception('Failed to load stray reports');
  }
}
