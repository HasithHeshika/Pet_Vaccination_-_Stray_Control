import 'dart:convert';
import 'api_client.dart';

class StrayService {
  final ApiClient _client = ApiClient();

  Future<Map<String, dynamic>> reportStray(Map<String, dynamic> data) async {
    final response = await _client.post('/api/stray-reports', body: data);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to report stray pet');
  }

  Future<List<dynamic>> getStrayReports() async {
    final response = await _client.get('/api/stray-reports');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load stray reports');
  }
}
