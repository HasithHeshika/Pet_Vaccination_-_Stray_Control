import 'dart:convert';
import 'api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  final ApiClient _client = ApiClient();

  Future<Map<String, dynamic>?> login(String email, String password) async {
    final response = await _client.post('/api/auth/login', body: {
      'email': email,
      'password': password,
    });
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      if (data['token'] != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', data['token']);
      }
      return data;
    }
    throw Exception('Failed to login: ${response.body}');
  }

  Future<Map<String, dynamic>?> signup(Map<String, dynamic> userData) async {
    final response = await _client.post('/api/auth/signup', body: userData);
    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    }
    throw Exception('Failed to signup: ${response.body}');
  }

  Future<Map<String, dynamic>?> getMe() async {
    final response = await _client.get('/api/auth/me');
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    return null;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
  }
}
