import 'dart:convert';
import 'api_client.dart';

class LicenseService {
  final ApiClient _client = ApiClient();

  Future<Map<String, dynamic>> getLicenseDashboard() async {
    final response = await _client.get('/api/licenses/dashboard');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load license dashboard');
  }

  Future<List<dynamic>> getMyLicenses() async {
    final response = await _client.get('/api/licenses/my-licenses');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load licenses');
  }

  Future<Map<String, dynamic>> getLicenseById(String id) async {
    final response = await _client.get('/api/licenses/$id');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load license');
  }

  Future<Map<String, dynamic>> applyLicense(Map<String, dynamic> data) async {
    final response = await _client.post('/api/licenses/apply', body: data);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to apply for license');
  }

  Future<Map<String, dynamic>> renewLicense(String id, Map<String, dynamic> data) async {
    final response = await _client.post('/api/licenses/$id/renew', body: data);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to renew license');
  }
}
