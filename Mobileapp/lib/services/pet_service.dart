import 'dart:convert';
import 'api_client.dart';

class PetService {
  final ApiClient _client = ApiClient();

  Future<List<dynamic>> getAllPets() async {
    final response = await _client.get('/api/pets');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load pets');
  }

  Future<Map<String, dynamic>> getPetById(String id) async {
    final response = await _client.get('/api/pets/$id');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load pet');
  }

  Future<Map<String, dynamic>> getPetByPetIdString(String petId) async {
    final response = await _client.get('/api/pets/petid/$petId');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load pet by pet id string');
  }

  Future<List<dynamic>> getUserPets(String userId) async {
    final response = await _client.get('/api/users/$userId/pets');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load user pets');
  }

  Future<Map<String, dynamic>> registerPet(Map<String, dynamic> data) async {
    final response = await _client.post('/api/pets', body: data);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to register pet');
  }

  Future<Map<String, dynamic>> updatePet(String petId, Map<String, dynamic> data) async {
    final response = await _client.put('/api/pets/$petId', body: data);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update pet');
  }
}
