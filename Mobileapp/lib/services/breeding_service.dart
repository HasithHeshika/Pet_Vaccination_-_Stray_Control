import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/community_listing.dart';
import 'api_client.dart';

/// Service for interacting with the Breeding Match backend API (/api/breeding-matches)
class BreedingService {
  static final BreedingService _instance = BreedingService._internal();
  factory BreedingService() => _instance;
  BreedingService._internal();

  final ApiClient _client = ApiClient();

  static const List<Color> _pastelColors = [
    Color(0xFFE8F0FE), // Soft sky blue
    Color(0xFFF3E8FD), // Soft lavender
    Color(0xFFFDE8E1), // Soft peach
    Color(0xFFE6F4EA), // Soft mint
    Color(0xFFFEF7E0), // Butter yellow
  ];

  static const Map<String, String> _speciesEmoji = {
    'Dog': '🐶',
    'Cat': '🐱',
    'Rabbit': '🐰',
    'Bird': '🐦',
    'Other': '🐾',
  };

  /// Fetch all active breeding listings from the backend.
  Future<List<CommunityListing>> getBreedingListings({
    String? species,
    String? breed,
    String? gender,
    String? city,
    bool? hasLicense,
    String? search,
  }) async {
    try {
      String path = '/api/breeding-matches?status=Active';
      if (species != null) path += '&species=${Uri.encodeComponent(species)}';
      if (breed != null) path += '&breed=${Uri.encodeComponent(breed)}';
      if (gender != null) path += '&gender=${Uri.encodeComponent(gender)}';
      if (city != null) path += '&city=${Uri.encodeComponent(city)}';
      if (hasLicense != null) path += '&hasLicense=$hasLicense';
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
      debugPrint('BreedingService.getBreedingListings error: $e');
      return [];
    }
  }

  /// Submit a new breeding listing.
  Future<Map<String, dynamic>> createListing(
      Map<String, dynamic> data, String token) async {
    final response = await _client.post('/api/breeding-matches',
        body: data, token: token);
    if (response.statusCode == 201) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final err = jsonDecode(response.body);
    throw Exception(err['message'] ?? 'Failed to create breeding listing');
  }

  /// Send a contact inquiry to a breeder.
  Future<void> contactBreeder(
      String listingId, Map<String, dynamic> data, String token) async {
    final response = await _client.post(
      '/api/breeding-matches/$listingId/contact',
      body: data,
      token: token,
    );
    if (response.statusCode != 201) {
      final err = jsonDecode(response.body);
      throw Exception(err['message'] ?? 'Failed to send inquiry');
    }
  }

  /// Delete a breeding listing (owner or admin).
  Future<void> deleteListing(String listingId, String token) async {
    final response = await _client.delete(
        '/api/breeding-matches/$listingId', token: token);
    if (response.statusCode != 200) {
      final err = jsonDecode(response.body);
      throw Exception(err['message'] ?? 'Failed to delete listing');
    }
  }

  /// Get listings created by the current user.
  Future<List<CommunityListing>> getMyListings(String token) async {
    try {
      final response = await _client.get(
          '/api/breeding-matches/user/my-listings', token: token);
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
      debugPrint('BreedingService.getMyListings error: $e');
      return [];
    }
  }

  // ── Internal mapper ──────────────────────────────────────────────────────
  CommunityListing _fromApi(Map<String, dynamic> data,
      {int colorIndex = 0}) {
    final owner = data['owner'] as Map<String, dynamic>?;
    final age = data['age'] as Map<String, dynamic>?;
    final species = data['species'] as String? ?? 'Other';
    final photos = (data['photos'] as List?)?.cast<String>() ?? [];
    final license = data['breederLicense'] as Map<String, dynamic>?;
    final healthClearances = data['healthClearances'] as List? ?? [];

    final healthRecords = healthClearances
        .map((h) {
          final hm = h as Map<String, dynamic>;
          return HealthRecordItem(
            title: hm['title'] as String? ?? 'Health Clearance',
            date: hm['date'] != null
                ? _formatDateString(hm['date'] as String)
                : 'Certified',
            status: hm['result'] as String? ?? 'Verified',
            clinic: hm['clinic'] as String? ?? 'Veterinary Clinic',
          );
        })
        .toList();

    final hasLicense = license != null && license['status'] == 'Approved';
    final tags = <String>[
      if (hasLicense) 'Licensed Breeder',
      if (data['pedigreeDetails'] != null &&
          (data['pedigreeDetails'] as String).isNotEmpty)
        'Pedigree',
      if (healthClearances.isNotEmpty) 'Health Tested',
      data['gender'] as String? ?? 'Unknown',
    ];

    return CommunityListing(
      id: data['_id'] as String? ?? '',
      petName: data['petName'] as String? ?? 'Unknown Pet',
      breed: data['breed'] as String? ?? 'Unknown Breed',
      category: 'Breeding Match',
      tags: tags,
      age: _buildAgeString(age),
      gender: data['gender'] as String? ?? 'Unknown',
      city: _buildCity(data),
      timestamp: _formatDate(data['createdAt'] as String?),
      description: data['pedigreeDetails'] as String? ??
          data['studTerms'] as String? ??
          'Quality breeding match available.',
      ownerName: owner?['fullName'] as String? ?? 'Breeder',
      ownerPhone: owner?['phone'] as String? ?? '',
      originalPhotoUrl: photos.isNotEmpty ? photos.first : null,
      emoji: _speciesEmoji[species] ?? '🐾',
      pastelColor: _pastelColors[colorIndex % _pastelColors.length],
      isHealthVerified: healthRecords.isNotEmpty,
      healthRecords: healthRecords,
      isFree: false,
    );
  }

  String _buildAgeString(Map<String, dynamic>? age) {
    if (age == null) return 'Unknown Age';
    final years = age['years'] as int? ?? 0;
    final months = age['months'] as int? ?? 0;
    if (years > 0 && months > 0) return '$years yr $months mo';
    if (years > 0) return '$years ${years == 1 ? "Year" : "Years"}';
    if (months > 0) return '$months ${months == 1 ? "Month" : "Months"}';
    return 'Young';
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

  String _formatDateString(String isoDate) {
    try {
      final dt = DateTime.parse(isoDate);
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return isoDate;
    }
  }
}
