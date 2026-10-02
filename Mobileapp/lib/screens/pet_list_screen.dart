import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class PetListScreen extends StatelessWidget {
  const PetListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("My Furry Friends"),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildPetCard("Milo", "Golden Retriever", "1 Year • Male", "assets/images/login_dog.png"),
          const SizedBox(height: 16),
          _buildPetCard("Luna", "Ginger Cat", "2 Years • Female", "assets/images/dashboard_cat.png"),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.activeOrange,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: () {},
      ),
    );
  }

  Widget _buildPetCard(String name, String breed, String details, String imagePath) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Image.asset(imagePath, width: 80, height: 80, fit: BoxFit.cover),
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
