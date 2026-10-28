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

  Future<List<dynamic>> getStrayReports({String? category, String? status}) async {
    String path = '/api/stray-reports';
    final params = <String>[];
    if (category != null) params.add('category=${Uri.encodeComponent(category)}');
    if (status != null) params.add('status=${Uri.encodeComponent(status)}');
    if (params.isNotEmpty) path += '?${params.join('&')}';

    final response = await _client.get(path);
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      if (decoded is List) return decoded;
      if (decoded is Map && decoded['reports'] is List) {
        return decoded['reports'] as List;
      }
      return [];
    }
    throw Exception('Failed to load stray reports');
  }

  /// Toggle support (upvote) on a stray report — requires auth token
  Future<Map<String, dynamic>> toggleSupport(String reportId, String token) async {
    final response = await _client.post(
      '/api/stray-reports/$reportId/support',
      body: {},
      token: token,
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to toggle support');
  }

  /// Get comments for a stray report
  Future<List<dynamic>> getComments(String reportId) async {
    final response = await _client.get('/api/stray-reports/$reportId/comments');
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      if (decoded is Map && decoded['comments'] is List) {
        return decoded['comments'] as List;
      }
      return [];
    }
    throw Exception('Failed to load comments');
  }

  /// Add a comment to a stray report — requires auth token
  Future<Map<String, dynamic>> addComment(
      String reportId, String text, String token) async {
    final response = await _client.post(
      '/api/stray-reports/$reportId/comments',
      body: {'text': text},
      token: token,
    );
    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to add comment');
  }
}
