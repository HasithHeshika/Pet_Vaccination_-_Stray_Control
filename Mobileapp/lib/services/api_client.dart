import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiClient {
  static const String baseUrl = 'https://pet-control-api-fxhkd7fwa5e2gtem.malaysiawest-01.azurewebsites.net';

  Future<Map<String, String>> _getHeaders({String? token}) async {
    String? resolvedToken = token;
    if (resolvedToken == null) {
      final prefs = await SharedPreferences.getInstance();
      resolvedToken = prefs.getString('token');
    }
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (resolvedToken != null) 'Authorization': 'Bearer $resolvedToken',
    };
  }

  Future<http.Response> get(String endpoint, {String? token}) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(token: token);
    return await http.get(url, headers: headers);
  }

  Future<http.Response> post(String endpoint,
      {Map<String, dynamic>? body, String? token}) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(token: token);
    return await http.post(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
  }

  Future<http.Response> put(String endpoint,
      {Map<String, dynamic>? body, String? token}) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(token: token);
    return await http.put(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
  }

  Future<http.Response> patch(String endpoint,
      {Map<String, dynamic>? body, String? token}) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(token: token);
    return await http.patch(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
  }

  Future<http.Response> delete(String endpoint, {String? token}) async {
    final url = Uri.parse('$baseUrl$endpoint');
    final headers = await _getHeaders(token: token);
    return await http.delete(url, headers: headers);
  }
}
