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
        
        // Save user ID securely for future queries
        if (data['user'] != null && data['user']['id'] != null) {
          await prefs.setString('userId', data['user']['id'].toString());
        } else if (data['user'] != null && data['user']['_id'] != null) {
          await prefs.setString('userId', data['user']['_id'].toString());
        }
        
        if (data['user'] != null && data['user']['role'] != null) {
          await prefs.setString('role', data['user']['role'].toString());
        }
      }
      return data;
    }
    
    // Better error message parsing
    String errorMessage = 'Failed to login';
    try {
      final errorData = jsonDecode(response.body);
      if (errorData['message'] != null) {
        errorMessage = errorData['message'];
      }
    } catch (_) {}
    
    throw Exception(errorMessage);
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
  
  Future<String?> getUserId() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('userId');
  }

  Future<String?> getUserRole() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('role');
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    await prefs.remove('userId');
    await prefs.remove('role');
  }
}
