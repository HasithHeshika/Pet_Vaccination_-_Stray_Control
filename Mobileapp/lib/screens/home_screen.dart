import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'pet_list_screen.dart';
import 'lost_found_screen.dart';
import 'vaccination_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      body: SafeArea(
        child: Column(
          children: [
            // Header Image and Greeting
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 25,
                    backgroundImage: AssetImage('assets/images/dashboard_cat.png'),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text(
                          "Hello there,",
                          style: TextStyle(fontSize: 14, color: AppTheme.primaryBrown),
                        ),
                        Text(
                          "Pet Lover! 🐾",
                          style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryText),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.notifications, color: AppTheme.primaryBrown, size: 30),
                    onPressed: () {},
                  )
                ],
              ),
            ),
            
            // Hero card
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 20),
              height: 150,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(24),
                image: const DecorationImage(
                  image: AssetImage('assets/images/dashboard_cat.png'),
                  fit: BoxFit.cover,
                  colorFilter: ColorFilter.mode(Colors.black38, BlendMode.darken),
                ),
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text(
                      "Veterinary & Authority Clinic",
                      style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.secondaryGold),
                      onPressed: () {},
                      child: const Text("Book Appointment"),
                    )
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            
            // Grid of categories
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
                decoration: const BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.only(topLeft: Radius.circular(40), topRight: Radius.circular(40)),
                ),
                child: GridView.count(
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 0.9,
                  children: [
                    _buildGridCard(context, "My Pets", Icons.pets, AppTheme.primaryBrown, Colors.white, () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const PetListScreen()));
                    }),
                    _buildGridCard(context, "Vaccinations", Icons.health_and_safety, AppTheme.background, AppTheme.primaryText, () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const VaccinationScreen()));
                    }),
                    _buildGridCard(context, "Lost & Found", Icons.search, AppTheme.primaryText, Colors.white, () {
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const LostFoundScreen()));
                    }),
                    _buildGridCard(context, "Licenses", Icons.badge, AppTheme.secondaryGold, Colors.white, () {}),
                  ],
                ),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildGridCard(BuildContext context, String title, IconData icon, Color bgColor, Color textColor, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(24),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 40, color: textColor),
            const SizedBox(height: 12),
            Text(
              title,
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: textColor),
            ),
          ],
        ),
      ),
    );
  }
}
