import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/pet_service.dart';
import '../services/auth_service.dart';

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

  Future<List<dynamic>> _loadPets() async {
    final userId = await AuthService().getUserId();
    if (userId != null && userId.isNotEmpty) {
      try {
        return await PetService().getUserPets(userId);
      } catch (e) {
        // Fallback onto all pets if single query fails or route doesn't match perfectly
        return await PetService().getAllPets();
      }
    }
    return [];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("My Furry Friends"),
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _petsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.primaryBrown));
          } else if (snapshot.hasError) {
            return Center(child: Text("Error fetching pets: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
             return const Center(child: Text("No pets found! Register one.", style: TextStyle(fontSize: 18, color: AppTheme.primaryBrown)));
          }

          final pets = snapshot.data!;
          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: pets.length,
            itemBuilder: (context, index) {
              final pet = pets[index];
              String name = pet['name'] ?? 'Unknown Pet';
              String breed = pet['breed'] ?? 'Unknown Breed';
              String details = "${pet['age'] ?? '?'} Years • ${pet['gender'] ?? 'Unknown'}";
              String? imagePath = pet['photoUrl'] ?? pet['imageUrl'] ?? pet['image'];
              return _buildPetCard(name, breed, details, imagePath);
            },
          );
        }
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.activeOrange,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: () {},
      ),
    );
  }

  Widget _buildPetCard(String name, String breed, String details, String? imagePath) {
    ImageProvider imageProvider;
    if (imagePath != null && imagePath.startsWith('http')) {
      imageProvider = NetworkImage(imagePath);
    } else {
      imageProvider = const AssetImage('assets/images/dashboard_cat.png');
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image(image: imageProvider, width: 80, height: 80, fit: BoxFit.cover),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryText)),
                  const SizedBox(height: 4),
                  Text(breed, style: const TextStyle(fontSize: 16, color: AppTheme.primaryBrown)),
                  const SizedBox(height: 4),
                  Text(details, style: const TextStyle(fontSize: 14, color: Colors.grey)),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, color: AppTheme.secondaryGold),
          ],
        ),
      ),
    );
  }
}
