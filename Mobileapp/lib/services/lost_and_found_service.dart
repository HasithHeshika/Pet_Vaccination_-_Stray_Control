import 'dart:convert';
import 'api_client.dart';

class LostAndFoundService {
  final ApiClient _client = ApiClient();

  Future<List<dynamic>> getLostAndFoundList() async {
    final response = await _client.get('/api/lost-and-found');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load lost and found items');
  }

  Future<Map<String, dynamic>> getLostAndFoundById(String id) async {
    final response = await _client.get('/api/lost-and-found/$id');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load lost and found item');
  }

  Future<Map<String, dynamic>> reportLost(Map<String, dynamic> data) async {
    final response = await _client.post('/api/lost-and-found', body: data);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to report lost item');
  }

  Future<Map<String, dynamic>> updateLostAndFound(String id, Map<String, dynamic> data) async {
    final response = await _client.put('/api/lost-and-found/$id', body: data);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update lost and found item');
  }

  Future<Map<String, dynamic>> updateStatus(String id, String status) async {
    final response = await _client.patch('/api/lost-and-found/$id/status', body: {'status': status});
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update status');
  }

  Future<void> deleteLostAndFound(String id) async {
    final response = await _client.delete('/api/lost-and-found/$id');
    if (response.statusCode != 200) {
      throw Exception('Failed to delete item');
    }
  }
}
