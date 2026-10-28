import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/community_listing.dart';
import 'api_client.dart';

/// Service for interacting with the Adoption backend API (/api/adoptions)
class AdoptionService {
  static final AdoptionService _instance = AdoptionService._internal();
  factory AdoptionService() => _instance;
  AdoptionService._internal();

  final ApiClient _client = ApiClient();

  // ── Pastel colour palette for cards (used when building CommunityListing) ──
  static const List<Color> _pastelColors = [
    Color(0xFFFDE8E1), // Soft peach
    Color(0xFFE6F4EA), // Soft mint
    Color(0xFFFEF7E0), // Butter yellow
    Color(0xFFF3E8FD), // Soft lavender
    Color(0xFFE8F0FE), // Soft sky blue
  ];

  static const Map<String, String> _speciesEmoji = {
    'Dog': '🐶',
    'Cat': '🐱',
    'Rabbit': '🐰',
    'Bird': '🐦',
    'Other': '🐾',
  };

  /// Fetch all available adoption listings from the backend.
  /// Falls back to an empty list on error so the UI can show local mock data.
  Future<List<CommunityListing>> getAdoptionListings({
    String? species,
    String? city,
    bool? isFree,
    String? search,
  }) async {
    try {
      String path = '/api/adoptions?status=Available';
      if (species != null) path += '&species=${Uri.encodeComponent(species)}';
      if (city != null) path += '&city=${Uri.encodeComponent(city)}';
      if (isFree != null) path += '&isFree=$isFree';
      if (search != null && search.isNotEmpty) {
        path += '&search=${Uri.encodeComponent(search)}';
      }

      final response = await _client.get(path);
      if (response.statusCode != 200) return [];

      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final listings = decoded['listings'] as List? ?? [];

      return listings
          .asMap()
          .entries
          .map((entry) => _fromApi(entry.value as Map<String, dynamic>,
              colorIndex: entry.key))
          .toList();
    } catch (e) {
      debugPrint('AdoptionService.getAdoptionListings error: $e');
      return [];
    }
  }

  /// Submit a new adoption listing.
  Future<Map<String, dynamic>> createListing(
      Map<String, dynamic> data, String token) async {
    final response =
        await _client.post('/api/adoptions', body: data, token: token);
    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final err = jsonDecode(response.body);
    throw Exception(err['message'] ?? 'Failed to create adoption listing');
  }

  /// Submit an adoption inquiry for a listing.
  Future<void> applyForAdoption(
      String listingId, Map<String, dynamic> data, String token) async {
    final response = await _client.post(
      '/api/adoptions/$listingId/inquire',
      body: data,
      token: token,
    );
    if (response.statusCode != 201) {
      final err = jsonDecode(response.body);
      throw Exception(err['message'] ?? 'Failed to submit inquiry');
    }
  }

  /// Update the status of an adoption listing (owner only).
  Future<void> updateStatus(
      String listingId, String status, String token) async {
    final response = await _client.patch(
      '/api/adoptions/$listingId/status',
      body: {'status': status},
      token: token,
    );
    if (response.statusCode != 200) {
      final err = jsonDecode(response.body);
      throw Exception(err['message'] ?? 'Failed to update listing status');
    }
  }

  /// Delete an adoption listing.
  Future<void> deleteListing(String listingId, String token) async {
    final response =
        await _client.delete('/api/adoptions/$listingId', token: token);
    if (response.statusCode != 200) {
      final err = jsonDecode(response.body);
      throw Exception(err['message'] ?? 'Failed to delete listing');
    }
  }

  /// Get listings created by the current user.
  Future<List<CommunityListing>> getMyListings(String token) async {
    try {
      final response = await _client.get(
          '/api/adoptions/user/my-listings', token: token);
      if (response.statusCode != 200) return [];

      final decoded = jsonDecode(response.body) as Map<String, dynamic>;
      final listings = decoded['listings'] as List? ?? [];
      return listings
          .asMap()
          .entries
          .map((entry) => _fromApi(entry.value as Map<String, dynamic>,
              colorIndex: entry.key))
          .toList();
    } catch (e) {
      debugPrint('AdoptionService.getMyListings error: $e');
      return [];
    }
  }

  // ── Internal mapper ──────────────────────────────────────────────────────
  CommunityListing _fromApi(Map<String, dynamic> data,
      {int colorIndex = 0}) {
    final listedBy = data['listedBy'] as Map<String, dynamic>?;
    final age = data['age'] as Map<String, dynamic>?;
    final species = data['species'] as String? ?? 'Other';
    final photos = (data['photos'] as List?)?.cast<String>() ?? [];
    final healthRecords =
        (data['healthRecords'] as List?)
            ?.map((r) =>
                HealthRecordItem.fromMap(r as Map<String, dynamic>))
            .toList() ??
        [];

    final ageStr = _buildAgeString(age);
    final isFree = data['isFree'] as bool? ?? true;
    final tags = <String>[
      if (isFree) 'FREE',
      if (data['isVaccinated'] == true) 'Vaccinated',
      if (data['isSpayedOrNeutered'] == true) 'Spayed/Neutered',
      species,
    ];

    return CommunityListing(
      id: data['_id'] as String? ?? '',
      petName: data['petName'] as String? ?? 'Unknown Pet',
      breed: data['breed'] as String? ?? 'Mixed / Unknown',
      category: 'Adoption',
      tags: tags,
      age: ageStr,
      gender: data['gender'] as String? ?? 'Unknown',
      city: _buildCity(data),
      timestamp: _formatDate(data['createdAt'] as String?),
      description: data['description'] as String? ?? '',
      ownerName: listedBy?['fullName'] as String? ?? 'Pet Owner',
      ownerPhone: listedBy?['phone'] as String? ?? '',
      originalPhotoUrl: photos.isNotEmpty ? photos.first : null,
      emoji: _speciesEmoji[species] ?? '🐾',
      pastelColor: _pastelColors[colorIndex % _pastelColors.length],
      isHealthVerified: healthRecords.isNotEmpty,
      healthRecords: healthRecords,
      isFree: isFree,
    );
  }

  String _buildAgeString(Map<String, dynamic>? age) {
    if (age == null) return 'Unknown Age';
    final years = age['years'] as int? ?? 0;
    final months = age['months'] as int? ?? 0;
    if (years > 0 && months > 0) return '$years yr $months mo';
    if (years > 0) return '$years ${years == 1 ? "Year" : "Years"}';
    if (months > 0) return '$months ${months == 1 ? "Month" : "Months"}';
    return 'Puppy / Kitten';
  }

  String _buildCity(Map<String, dynamic> data) {
    final city = data['city'] as String?;
    final district = data['district'] as String?;
    if (city != null && district != null) return '$city, $district';
    return city ?? district ?? 'Sri Lanka';
  }

  String _formatDate(String? isoDate) {
    if (isoDate == null) return 'Recently';
    try {
      final dt = DateTime.parse(isoDate).toLocal();
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 60) return '${diff.inMinutes} mins ago';
      if (diff.inHours < 24) return '${diff.inHours} hours ago';
      if (diff.inDays == 1) return 'Yesterday';
      return '${diff.inDays} days ago';
    } catch (_) {
      return 'Recently';
    }
  }
}
