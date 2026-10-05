import 'package:flutter/material.dart';
import 'dart:convert' as dart_convert;
import '../theme/app_theme.dart';
import '../services/pet_service.dart';
import '../services/auth_service.dart';
import 'pet_details_screen.dart';

class PetListScreen extends StatefulWidget {
  const PetListScreen({super.key});

  @override
  State<PetListScreen> createState() => _PetListScreenState();
}

class _PetListScreenState extends State<PetListScreen> {
  late Future<List<dynamic>> _petsFuture;

  @override
  void initState() {
    super.initState();
    _petsFuture = _loadPets();
  }

  void _reload() {
    setState(() {
      _petsFuture = _loadPets();
    });
  }

  Future<List<dynamic>> _loadPets() async {
    final userId = await AuthService().getUserId();
    if (userId == null || userId.isEmpty) {
      return [];
    }
    // getUserPets now correctly unwraps { pets: [...] }
    return await PetService().getUserPets(userId);
  }

  /// Returns the best available image string (URL or base64) from the pet object,
  /// matching the same logic the web app uses via getPetImages().
  String? _resolveImage(Map<String, dynamic> pet) {
    // Check photos array first (same as web's getPetImages utility)
    final photos = pet['photoUrls'];
    if (photos is List && photos.isNotEmpty) {
      final first = photos[0];
      if (first is String && first.isNotEmpty) return first;
    }
    // Fallback to photoUrl string
    final photoUrl = pet['photoUrl'];
    if (photoUrl is String && photoUrl.isNotEmpty) return photoUrl;
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('My Furry Friends'),
        backgroundColor: AppTheme.primaryBrown,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _reload,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _petsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: AppTheme.primaryBrown),
                  SizedBox(height: 16),
                  Text('Loading your pets...', style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }
          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 60, color: Colors.red),
                    const SizedBox(height: 16),
                    const Text('Could not load pets', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(
                      '${snapshot.error}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: _reload,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Try Again'),
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primaryBrown, foregroundColor: Colors.white),
                    ),
                  ],
                ),
              ),
            );
          }
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.pets, size: 72, color: AppTheme.secondaryGold),
                    const SizedBox(height: 16),
                    const Text(
                      "No pets found!",
                      style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryText),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      "Contact the administrator to register your pet.",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 20),
                    OutlinedButton.icon(
                      onPressed: _reload,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Refresh'),
                    ),
                  ],
                ),
              ),
            );
          }

          final pets = snapshot.data!;
          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: pets.length,
            itemBuilder: (context, index) {
              final pet = pets[index] as Map<String, dynamic>;
              final String name = pet['petName'] ?? 'Unknown Pet';
              final String rawBreed = pet['breed'] ?? 'Unknown';
              final String breed = rawBreed == 'Other' ? (pet['breedOther'] ?? 'Other') : rawBreed;
              final int ageY = (pet['age'] is Map) ? ((pet['age']['years'] ?? 0) as num).toInt() : 0;
              final String gender = pet['gender'] ?? 'Unknown';
              final String details = '$ageY Years • $gender';
              final String? imagePath = _resolveImage(pet);

              return InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => PetDetailsScreen(pet: pet)),
                  ).then((_) => _reload()); // refresh on return
                },
                child: _buildPetCard(name, breed, details, imagePath),
              );
            },
          );
        },
      ),
    );
  }

  Widget _buildPetCard(String name, String breed, String details, String? imagePath) {
    ImageProvider imageProvider;
    if (imagePath != null && imagePath.startsWith('http')) {
      imageProvider = NetworkImage(imagePath);
    } else if (imagePath != null && imagePath.startsWith('data:image')) {
      try {
        final base64String = imagePath.split(',').last;
        imageProvider = MemoryImage(dart_convert.base64Decode(base64String));
      } catch (_) {
        imageProvider = const AssetImage('assets/images/dashboard_cat.png');
      }
    } else {
      imageProvider = const AssetImage('assets/images/dashboard_cat.png');
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 3,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image(
                image: imageProvider,
                width: 84,
                height: 84,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) =>
                    Container(
                      width: 84,
                      height: 84,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: const Icon(Icons.pets, size: 40, color: Colors.grey),
                    ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryText)),
                  const SizedBox(height: 4),
                  Text(breed, style: const TextStyle(fontSize: 15, color: AppTheme.primaryBrown)),
                  const SizedBox(height: 4),
                  Text(details, style: const TextStyle(fontSize: 13, color: Colors.grey)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: AppTheme.secondaryGold, size: 18),
          ],
        ),
      ),
    );
  }
}
