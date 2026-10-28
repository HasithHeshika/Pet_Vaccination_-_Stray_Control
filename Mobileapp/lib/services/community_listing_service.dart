import 'package:flutter/material.dart';
import '../models/community_listing.dart';
import 'adoption_service.dart';
import 'breeding_service.dart';

/// Unified service that merges adoption + breeding listings from the real backend.
/// Falls back to local seed data when the network is unavailable.
class CommunityListingService {
  static final CommunityListingService _instance =
      CommunityListingService._internal();
  factory CommunityListingService() => _instance;
  CommunityListingService._internal();

  final AdoptionService _adoptionService = AdoptionService();
  final BreedingService _breedingService = BreedingService();

  // ── Local seed / mock data (shown when backend is unreachable) ────────────
  late final List<CommunityListing> _mockListings = _buildMockListings();

  List<CommunityListing> _buildMockListings() {
    return [
      CommunityListing(
        id: 'mock-list-001',
        petName: 'Bella',
        breed: 'Golden Retriever Mix',
        category: 'Adoption',
        tags: const ['FREE', 'Mixed', 'Vaccinated', 'Friendly'],
        age: '1.5 Years',
        gender: 'Female',
        city: 'Colombo, Western Province',
        timestamp: '2 hours ago',
        description:
            'Bella is an affectionate, energetic, and fully house-trained Golden mix looking for a loving forever family with space to play fetch. Great around kids and other pets!',
        ownerName: 'Dr. Sarah Jenkins',
        ownerPhone: '+94 77 123 4567',
        originalPhotoUrl: 'assets/images/puppy.png',
        emoji: '🐶',
        pastelColor: const Color(0xFFFDE8E1),
        isHealthVerified: true,
        isFree: true,
        healthRecords: const [
          HealthRecordItem(
            title: 'Rabies Annual Booster',
            date: 'Jan 15, 2026',
            status: 'Verified',
            clinic: 'City Vet Hospital',
          ),
          HealthRecordItem(
            title: 'DHPP Core Vaccination',
            date: 'Dec 02, 2025',
            status: 'Verified',
            clinic: 'City Vet Hospital',
          ),
          HealthRecordItem(
            title: 'Microchip ID Registered',
            date: 'ID: #985141002341',
            status: 'Verified',
            clinic: 'National Pet Registry',
          ),
        ],
      ),
      CommunityListing(
        id: 'mock-list-002',
        petName: 'Thor',
        breed: 'Siberian Husky',
        category: 'Breeding Match',
        tags: const ['Purebred', 'Certified Pedigree', 'Champion Line'],
        age: '2.5 Years',
        gender: 'Male',
        city: 'Kandy, Central Province',
        timestamp: '5 hours ago',
        description:
            'Thor is a champion-bloodline Siberian Husky with piercing blue eyes, excellent hip and eye certifications, and an energetic, gentle temperament.',
        ownerName: 'Naveen Mendis',
        ownerPhone: '+94 71 884 9201',
        originalPhotoUrl: null,
        emoji: '🐺',
        pastelColor: const Color(0xFFE8F0FE),
        isHealthVerified: true,
        isFree: false,
        healthRecords: const [
          HealthRecordItem(
            title: 'Comprehensive DNA & Genetic Screen',
            date: 'Nov 18, 2025',
            status: 'Verified',
            clinic: 'Canine Genetic Lab',
          ),
          HealthRecordItem(
            title: 'OFA Hip & Elbow Certification',
            date: 'Oct 04, 2025',
            status: 'Verified',
            clinic: 'Veterinary Orthopedic Registry',
          ),
        ],
      ),
      CommunityListing(
        id: 'mock-list-003',
        petName: 'Milo & Cleo',
        breed: 'Domestic Short Hair',
        category: 'Adoption',
        tags: const ['FREE', 'Mixed', 'Spayed', 'Litter Trained'],
        age: '8 Months',
        gender: 'Pair (M & F)',
        city: 'Galle, Southern Province',
        timestamp: 'Yesterday',
        description:
            'Bonded brother and sister rescued as tiny kittens. Calm, purring machines who love sunny spots and cozy laps.',
        ownerName: 'Amara Wickramasinghe',
        ownerPhone: '+94 76 345 8899',
        originalPhotoUrl: 'assets/images/kitten_puppy.png',
        emoji: '🐱',
        pastelColor: const Color(0xFFE6F4EA),
        isHealthVerified: true,
        isFree: true,
        healthRecords: const [
          HealthRecordItem(
            title: 'FVRCP Feline Core Vaccine',
            date: 'Jan 20, 2026',
            status: 'Verified',
            clinic: 'Galle Coastal Vet',
          ),
          HealthRecordItem(
            title: 'Spayed & Neutered',
            date: 'Jan 22, 2026',
            status: 'Verified',
            clinic: 'Southern Pet Surgery Center',
          ),
        ],
      ),
    ];
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /// Fetch all listings (adoption + breeding) merged from backend.
  /// Falls back to local mock data if the network request fails.
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
      final merged = results.expand((l) => l).toList()
        ..sort((a, b) => b.timestamp.compareTo(a.timestamp));

      // If backend returned data, use it; otherwise fall back to mocks
      if (merged.isNotEmpty) return merged;
    } catch (e) {
      debugPrint('CommunityListingService.getListings error: $e');
    }

    // Fallback: filter mocks by category
    if (category != null) {
      return _mockListings
          .where((l) => l.category == category)
          .toList();
    }
    return List.unmodifiable(_mockListings);
  }

  /// Returns the local mock/seed list (synchronous — for backwards compat).
  List<CommunityListing> getListingsSync() {
    return List.unmodifiable(_mockListings);
  }

  /// Add a listing to the local mock list (used after a successful POST).
  void addListing(CommunityListing listing) {
    _mockListings.insert(0, listing);
  }

  /// Default pre-registered pets available for instant selection in the Listing Form.
  List<Map<String, dynamic>> getSampleRegisteredPets() {
    return [
      {
        'id': 'reg-01',
        'name': 'Max',
        'breed': 'Golden Retriever',
        'gender': 'Male',
        'age': '2 Years',
        'photoUrl': 'assets/images/puppy.png',
        'emoji': '🐶',
        'city': 'Colombo',
        'vaccinations': [
          {
            'title': 'Rabies Vaccine (Annual)',
            'date': 'Jan 10, 2026',
            'status': 'Verified',
            'clinic': 'Metro Veterinary Care',
          },
          {
            'title': 'DHPP 5-in-1 Vaccine',
            'date': 'Dec 14, 2025',
            'status': 'Verified',
            'clinic': 'Metro Veterinary Care',
          },
        ],
      },
      {
        'id': 'reg-02',
        'name': 'Chloe',
        'breed': 'Persian Longhair',
        'gender': 'Female',
        'age': '1.5 Years',
        'photoUrl': 'assets/images/dashboard_cat.png',
        'emoji': '🐱',
        'city': 'Kandy',
        'vaccinations': [
          {
            'title': 'Feline Rabies Vaccine',
            'date': 'Nov 20, 2025',
            'status': 'Verified',
            'clinic': 'Kandy Pet Wellness',
          },
          {
            'title': 'FVRCP Triple Protection',
            'date': 'Nov 20, 2025',
            'status': 'Verified',
            'clinic': 'Kandy Pet Wellness',
          },
        ],
      },
      {
        'id': 'reg-03',
        'name': 'Rocky',
        'breed': 'German Shepherd',
        'gender': 'Male',
        'age': '3 Years',
        'photoUrl': 'assets/images/login_dog.png',
        'emoji': '🐕',
        'city': 'Galle',
        'vaccinations': [
          {
            'title': 'Rabies Multidose',
            'date': 'Dec 05, 2025',
            'status': 'Verified',
            'clinic': 'Southern Animal Hospital',
          },
          {
            'title': 'Canine Parvovirus Booster',
            'date': 'Dec 05, 2025',
            'status': 'Verified',
            'clinic': 'Southern Animal Hospital',
          },
          {
            'title': 'Kennel Cough (Bordetella)',
            'date': 'Oct 11, 2025',
            'status': 'Verified',
            'clinic': 'Southern Animal Hospital',
          },
        ],
      },
    ];
  }
}
