import 'dart:convert';
import 'api_client.dart';

class PetService {
  final ApiClient _client = ApiClient();

  Future<List<dynamic>> getAllPets() async {
    final response = await _client.get('/api/pets');
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      // Handle both array response and { pets: [...] } envelope
      if (decoded is List) return decoded;
      if (decoded is Map && decoded['pets'] != null) return decoded['pets'];
      return [];
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
    final response = await _client.get('/api/pets/petid/${Uri.encodeComponent(petId)}');
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      // API returns { pet: {...} }
      if (decoded is Map<String, dynamic> && decoded['pet'] is Map<String, dynamic>) {
        return decoded['pet'];
      }
      return decoded;
    }
    throw Exception('Failed to load pet by pet id string');
  }

  Future<List<dynamic>> getUserPets(String userId) async {
    final response = await _client.get('/api/users/$userId/pets');
    if (response.statusCode == 200) {
      final decoded = jsonDecode(response.body);
      // Web uses response.data.pets — API returns { pets: [...] }
      if (decoded is List) return decoded;
      if (decoded is Map && decoded['pets'] != null) return decoded['pets'];
      return [];
    }
    throw Exception('Failed to load user pets: ${response.statusCode}');
  }

  Future<Map<String, dynamic>> registerPet(Map<String, dynamic> data) async {
    final response = await _client.post('/api/pets/register', body: data);
    if (response.statusCode == 201 || response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to register pet');
  }

  // Only pet photos can be edited via the API; other details are changed by an administrator
  Future<Map<String, dynamic>> updatePetPhotos(String petMongoId, List<String> photoUrls) async {
    final response = await _client.put('/api/pets/$petMongoId/photos', body: {'photoUrls': photoUrls});
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update pet photos');
  }
}
