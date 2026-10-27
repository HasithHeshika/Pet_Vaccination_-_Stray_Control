import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

// Records every request and answers with [handler]. Services use the top-level http functions,
// so wrapping a call in [http.runWithClient] routes it here without touching the real API.
class MockApi {
  final List<http.Request> requests = [];
  final http.Response Function(http.Request request) handler;

  MockApi(this.handler);

  MockApi.json(int status, Object body) : this((_) => http.Response(jsonEncode(body), status));

  late final client = MockClient((request) async {
    requests.add(request);
    return handler(request);
  });

  Future<T> run<T>(Future<T> Function() body) => http.runWithClient(body, () => client);
}
