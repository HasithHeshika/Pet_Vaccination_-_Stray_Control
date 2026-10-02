import 'dart:convert';
import 'api_client.dart';

class VaccinationService {
  final ApiClient _client = ApiClient();

  Future<Map<String, dynamic>> addVaccination(Map<String, dynamic> data) async {
    final response = await _client.post('/api/vaccinations', body: data);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to add vaccination');
  }

  Future<List<dynamic>> getPetVaccinations(String petId) async {
    final response = await _client.get('/api/vaccinations/pet/$petId');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load pet vaccinations');
  }

  Future<void> deleteVaccination(String vacId) async {
    final response = await _client.delete('/api/vaccinations/$vacId');
    if (response.statusCode != 200) {
      throw Exception('Failed to delete vaccination');
    }
  }

  Future<void> sendReminder(String vacId) async {
    final response = await _client.post('/api/vaccinations/$vacId/send-reminder');
    if (response.statusCode != 200) {
      throw Exception('Failed to send reminder');
    }
  }

  Future<List<dynamic>> getUpcomingUserVaccinations() async {
    final response = await _client.get('/api/vaccinations/user/upcoming');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load upcoming user vaccinations');
  }

  Future<List<dynamic>> getUpcomingVaccinations(int days) async {
    final response = await _client.get('/api/vaccinations/upcoming?days=$days');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load upcoming vaccinations');
  }

  Future<List<dynamic>> getOverdueVaccinations() async {
    final response = await _client.get('/api/vaccinations/overdue');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load overdue vaccinations');
  }
}
