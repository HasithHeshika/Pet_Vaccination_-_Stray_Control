import 'dart:convert';
import 'api_client.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  final ApiClient _client = ApiClient();

  // Admin accounts carry isAdmin=true; older API versions report their role as 'user'
  static String effectiveRole(Map<String, dynamic>? user) {
    if (user == null) return 'user';
    if (user['isAdmin'] == true) return 'admin';
    return (user['role'] ?? 'user').toString();
  }

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
        
        if (data['user'] != null) {
          final role = effectiveRole(Map<String, dynamic>.from(data['user']));
          await prefs.setString('role', role);
          data['user']['role'] = role;
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
    // Show the server's message (e.g. "User already exists"), not the raw JSON body
    String message = 'Failed to sign up. Please try again.';
    try {
      final body = jsonDecode(response.body);
      if (body is Map && body['message'] != null) {
        message = body['message'].toString();
      } else if (body is Map && body['errors'] is List && (body['errors'] as List).isNotEmpty) {
        message = (body['errors'] as List).first['msg']?.toString() ?? message;
      }
    } catch (_) {}
    throw Exception(message);
  }

  // Emails a password reset link; the link opens the web app to set the new password.
  // Returns the server's message (the same whether or not the account exists).
  Future<String> requestPasswordReset(String email) async {
    final response = await _client.post('/api/auth/forgot-password', body: {'email': email});
    String message = 'Could not send the reset link. Please try again.';
    try {
      message = jsonDecode(response.body)['message'] ?? message;
    } catch (_) {}
    if (response.statusCode == 200) return message;
    throw Exception(message);
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
