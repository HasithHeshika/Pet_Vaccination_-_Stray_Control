import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import 'pet_list_screen.dart';
import 'lost_found_screen.dart';
import 'vaccination_screen.dart';
import '../services/auth_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  void _onItemTapped(int index) {
    if (index == 0) return;
    
    Widget target;
    if (index == 1) {
      target = const PetListScreen();
    } else if (index == 2) {
      target = const VaccinationScreen();
    } else {
      // Profile screen isn't fully scaffolded yet, so ignoring for the moment.
      return; 
    }
    
    Navigator.push(context, MaterialPageRoute(builder: (_) => target)).then((_) {
      if (mounted) setState(() => _selectedIndex = 0); // Snap back to home tab icon implicitly when returning
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9), // Light cream
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Image and Greeting mapped to Live User
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: FutureBuilder<Map<String, dynamic>?>(
                future: AuthService().getMe(),
                builder: (context, snapshot) {
                  String name = "Pet Lover!";
                  if (snapshot.hasData && snapshot.data != null) {
                    final data = snapshot.data!;
                    name = data['fullName'] ?? data['firstName'] ?? data['email']?.split('@').first ?? name;
                  }
                  
                  return Row(
                    children: [
                      // Avatar exactly inside the Top Left Corner per request
                      const CircleAvatar(
                        radius: 28,
                        backgroundImage: AssetImage('assets/images/dashboard_cat.png'),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              "Hello there,",
                              style: TextStyle(fontSize: 15, color: Color(0xFF5C4033)),
                            ),
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    name,
                                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Icon(Icons.pets, size: 16, color: Color(0xFFAB7B57)),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Container(
                        decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF9E6D4E)),
                        child: IconButton(
                          icon: const Icon(Icons.notifications, color: Colors.white),
                          onPressed: () {},
                        ),
                      )
                    ],
                  );
                }
              ),
            ),
            
            // Shaded overlapping banner (Info message)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 8.0),
              child: Stack(
                clipBehavior: Clip.none,
                alignment: Alignment.topCenter,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 24), // Leave space for floating icon
                    padding: const EdgeInsets.fromLTRB(20, 28, 20, 20),
                    decoration: BoxDecoration(
                       color: const Color(0xFF8B5A2B), // Brown matching specific mockup hue
                       borderRadius: BorderRadius.circular(16),
                       boxShadow: [
                         BoxShadow(color: Colors.black.withAlpha(40), spreadRadius: 1, blurRadius: 10, offset: const Offset(0, 4))
                       ]
                    ),
                    child: const Text(
                      "Your pet registration will be handled by the administrator. Once your pet is registered, you can view and download the QR code from the My Pets section.",
                      style: TextStyle(color: Colors.white, fontSize: 13, height: 1.4, fontWeight: FontWeight.w500),
                      textAlign: TextAlign.center,
                    ),
                  ),
                  Positioned(
                    top: 0,
                    child: Container(
                       decoration: BoxDecoration(
                         shape: BoxShape.circle,
                         color: const Color(0xFF5C4033),
                         border: Border.all(color: const Color(0xFFF9EED9), width: 4)
                       ),
                       padding: const EdgeInsets.all(8),
                       child: const Icon(Icons.info_outline, color: Color(0xFFDECAAE), size: 30) // Gold info i
                    )
                  )
                ]
              ),
            ),
            
            // Quick Actions Title
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 24, 24, 16),
              child: Text(
                "Quick Actions", 
                style: TextStyle(color: Color(0xFF8B5A2B), fontSize: 24, fontWeight: FontWeight.bold)
              ),
            ),
            
            // Grid of categories seamlessly mapped
            Expanded(
              child: GridView.count(
                padding: const EdgeInsets.symmetric(horizontal: 24.0),
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 0.95,
                children: [
                   // View My Pets (Brown padded wrapping around AI Image)
                  _buildActionCard(
                     title: "View My Pets",
                     iconWidget: Container(
                       padding: const EdgeInsets.all(4),
                       decoration: BoxDecoration(
                         shape: BoxShape.circle, // Fancy mock ornamental wrapper substitute
                         border: Border.all(color: const Color(0xFFD4A373), width: 2), // Gold ring
                       ),
                       child: ClipRRect(
                          borderRadius: BorderRadius.circular(50),
                          child: Image.asset('assets/images/kitten_puppy.png', width: 68, height: 68, fit: BoxFit.cover),
                       ),
                     ),
                     bgColor: const Color(0xFF9E6D4E),
                     textColor: Colors.white,
                     onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PetListScreen()))
                  ),
                  // Vaccination Schedule (Deep Espresso)
                  _buildActionCard(
                     title: "Vaccination\nSchedule",
                     iconWidget: const Stack(
                       children: [
                         Icon(Icons.vaccines, color: Color(0xFFDECAAE), size: 55), 
                         Positioned(right:-5, bottom:-5, child: Icon(Icons.calendar_month, color: Color(0xFFDECAAE), size: 28))
                       ]
                     ),
                     bgColor: const Color(0xFF5C4033),
                     textColor: Colors.white,
                     onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VaccinationScreen()))
                  ),
                  // Breeder Licensing (Light Tan/Gold)
                  _buildActionCard(
                     title: "Breeder\nLicensing",
                     iconWidget: const Stack(
                       children: [
                         Icon(Icons.pets, color: Color(0xFF9E6D4E), size: 55), 
                         Positioned(right:-5, bottom:-5, child: Icon(Icons.workspace_premium, color: Color(0xFF5C4033), size: 30))
                       ]
                     ),
                     bgColor: const Color(0xFFDEC49B),
                     textColor: const Color(0xFF5C4033),
                     onTap: () {} // Pending impl
                  ),
                  // Report a Stray (Cream White)
                  _buildActionCard(
                     title: "Report a Stray",
                     iconWidget: const Stack(
                       children: [
                         Icon(Icons.pets, color: Color(0xFF5C4033), size: 55), 
                         Positioned(right:-10, bottom:-5, child: Icon(Icons.search, color: Color(0xFF8B5A2B), size: 35))
                       ]
                     ),
                     bgColor: const Color(0xFFFFFDF5),
                     textColor: const Color(0xFF5C4033),
                     onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LostFoundScreen())) 
                  )
                ],
              ),
            )
          ],
        ),
      ),
      
      // Gorgeous Dark Bottom Nav Bar
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          boxShadow: [
             BoxShadow(color: Colors.black26, blurRadius: 15, spreadRadius: 0, offset: Offset(0, -2))
          ],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          child: BottomNavigationBar(
            backgroundColor: const Color(0xFF5C4033),
            type: BottomNavigationBarType.fixed,
            selectedItemColor: const Color(0xFFDEC49B), // Active Gold
            unselectedItemColor: Colors.white54,
            selectedFontSize: 12,
            unselectedFontSize: 12,
            currentIndex: _selectedIndex,
            showUnselectedLabels: true,
            onTap: _onItemTapped,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(icon: Icon(Icons.pets), label: 'My Pets'),
              BottomNavigationBarItem(icon: Icon(Icons.vaccines), label: 'Vaccinations'),
              BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
            ],
          ),
        ),
      ),
    );
  }

  // Reusable action card renderer
  Widget _buildActionCard({required String title, required Widget iconWidget, required Color bgColor, required Color textColor, required VoidCallback onTap}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
             BoxShadow(color: Colors.black.withAlpha(20), spreadRadius: 1, blurRadius: 10, offset: const Offset(0, 5))
          ]
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            iconWidget,
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: textColor),
            ),
          ],
        ),
      ),
    );
  }
}
