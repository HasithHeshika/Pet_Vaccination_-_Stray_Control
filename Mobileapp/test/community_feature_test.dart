import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobileapp/screens/community_feed_screen.dart';
import 'package:mobileapp/screens/adoption_screen.dart';
import 'package:mobileapp/screens/breeding_match_screen.dart';
import 'package:mobileapp/screens/listing_form_screen.dart';
import 'package:mobileapp/models/community_listing.dart';
import 'package:mobileapp/services/community_listing_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Community Listing Feature Tests', () {
    test('CommunityListing model instantiation and copyWith', () {
      final listing = CommunityListing(
        id: 'test-1',
        petName: 'Rocky',
        breed: 'Husky',
        category: 'Adoption',
        tags: ['FREE', 'Mixed'],
        age: '2 Years',
        gender: 'Male',
        city: 'Colombo',
        timestamp: 'Just now',
        description: 'Friendly dog',
        ownerName: 'Alice',
        ownerPhone: '+94 77 123 4567',
        isFree: true,
      );

      expect(listing.petName, 'Rocky');
      expect(listing.isFree, true);
      expect(listing.tags.contains('FREE'), true);

      final updated = listing.copyWith(petName: 'Rocky Jr', isFree: false);
      expect(updated.petName, 'Rocky Jr');
      expect(updated.isFree, false);
    });

    test('CommunityListingService adds and fetches listings', () {
      final service = CommunityListingService();
      final initialCount = service.getListings().length;

      final newPet = CommunityListing(
        id: 'test-custom',
        petName: 'Simba',
        breed: 'Tabby Cat',
        category: 'Breeding Match',
        tags: ['Purebred'],
        age: '1 Year',
        gender: 'Male',
        city: 'Kandy',
        timestamp: 'Just now',
        description: 'Playful cat',
        ownerName: 'Bob',
        ownerPhone: '+94 71 234 5678',
        isFree: false,
      );

      service.addListing(newPet);
      expect(service.getListings().length, initialCount + 1);
      expect(service.getListings().first.petName, 'Simba');
    });

    testWidgets('CommunityFeedScreen renders complaints and lost pet advertisement tabs', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: CommunityFeedScreen(),
        ),
      );
      await tester.pump();

      expect(find.text("Community Hub"), findsOneWidget);
      expect(find.text("Complaints & Incidents"), findsOneWidget);
      expect(find.text("Lost Pet Advertisements"), findsOneWidget);
    });

    testWidgets('AdoptionScreen renders correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: AdoptionScreen(),
        ),
      );
      await tester.pump();

      expect(find.text("Pet Adoption 🐾"), findsOneWidget);
      expect(find.text("List Pet"), findsOneWidget);
    });

    testWidgets('BreedingMatchScreen renders correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: BreedingMatchScreen(),
        ),
      );
      await tester.pump();

      expect(find.text("Breeding Match 🧬"), findsOneWidget);
      expect(find.text("Post Match"), findsOneWidget);
    });

    testWidgets('ListingFormScreen renders form controls', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: ListingFormScreen(),
        ),
      );
      await tester.pump();

      expect(find.text("List a Pet"), findsOneWidget);
      expect(find.text("Select Pre-Registered Pet"), findsOneWidget);
      expect(find.text("Listing Purpose"), findsOneWidget);
      expect(find.text("Brief Description"), findsOneWidget);
      expect(find.text("Owner's Contact Number"), findsOneWidget);
    });
  });
}
