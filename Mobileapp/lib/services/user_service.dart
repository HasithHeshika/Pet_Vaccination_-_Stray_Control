import 'dart:convert';
import 'api_client.dart';

class UserService {
  final ApiClient _client = ApiClient();

  Future<List<dynamic>> getUsers() async {
    final response = await _client.get('/api/users');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load users');
  }

  Future<Map<String, dynamic>> getUser(String userId) async {
    final response = await _client.get('/api/users/$userId');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to load user info');
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final response = await _client.put('/api/users/profile', body: data);
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update profile');
  }

  Future<Map<String, dynamic>> updateProfilePicture(String profilePictureBase64) async {
    final response = await _client.put('/api/users/profile-picture', body: {
      'profilePicture': profilePictureBase64
    });
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to update profile picture');
  }

  Future<Map<String, dynamic>> changePassword(String currentPassword, String newPassword) async {
    final response = await _client.put('/api/users/change-password', body: {
      'currentPassword': currentPassword,
      'newPassword': newPassword,
    });
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to change password');
  }

  Future<void> verifyUser(String userId) async {
    final response = await _client.patch('/api/users/$userId/verify');
    if (response.statusCode != 200) {
      throw Exception('Failed to verify user');
    }
  }
}
