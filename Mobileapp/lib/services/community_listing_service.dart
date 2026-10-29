import 'package:flutter/material.dart';
import '../models/community_listing.dart';
import 'adoption_service.dart';
import 'breeding_service.dart';

/// Unified service that merges adoption + breeding listings from the real backend.
class CommunityListingService {
  static final CommunityListingService _instance =
      CommunityListingService._internal();
  factory CommunityListingService() => _instance;
  CommunityListingService._internal();

  final AdoptionService _adoptionService = AdoptionService();
  final BreedingService _breedingService = BreedingService();

  // ── Public API ─────────────────────────────────────────────────────────────

  /// Fetch all listings (adoption + breeding) merged from backend.
  /// Returns an empty list on network failure.
  Future<List<CommunityListing>> getListings({
    String? category, // 'Adoption' | 'Breeding Match' | null = all
    String? species,
    String? city,
    bool? isFree,
    String? search,
  }) async {
    try {
      final futures = <Future<List<CommunityListing>>>[];

      if (category == null || category == 'Adoption') {
        futures.add(_adoptionService.getAdoptionListings(
          species: species,
          city: city,
          isFree: isFree,
          search: search,
        ));
      }
      if (category == null || category == 'Breeding Match') {
        futures.add(_breedingService.getBreedingListings(
          species: species,
          city: city,
          search: search,
        ));
      }

      final results = await Future.wait(futures);
      return results.expand((l) => l).toList()
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));
    } catch (e) {
      debugPrint('CommunityListingService.getListings error: $e');
      return [];
    }
  }
}
