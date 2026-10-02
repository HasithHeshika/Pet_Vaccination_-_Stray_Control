import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class LostFoundScreen extends StatelessWidget {
  const LostFoundScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Lost & Found"),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          _buildLostCard("Buddy", "Lost yesterday near Central Park. Very friendly but shy.", "assets/images/login_dog.png", true),
          const SizedBox(height: 16),
          _buildLostCard("Whiskers", "Found wandering near 1st avenue. Safe at clinic.", "assets/images/dashboard_cat.png", false),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.activeOrange,
        child: const Icon(Icons.add_alert, color: Colors.white),
        onPressed: () {},
      ),
    );
  }

  Widget _buildLostCard(String title, String description, String imagePath, bool isLost) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                child: Image.asset(imagePath, height: 180, width: double.infinity, fit: BoxFit.cover),
              ),
              Positioned(
                top: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                     color: isLost ? AppTheme.activeOrange : AppTheme.secondaryGold,
                     borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                     isLost ? "LOST" : "FOUND",
                     style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              )
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryText)),
                const SizedBox(height: 8),
                Text(description, style: const TextStyle(fontSize: 16, color: AppTheme.primaryBrown)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 45)
                  ),
                  child: const Text("Contact Owner"),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
