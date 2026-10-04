import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/license_service.dart';
import '../login_screen.dart';
import '../profile_screen.dart';
import 'apply_license_screen.dart';
import 'license_status_screen.dart';

class BreederDashboard extends StatefulWidget {
  const BreederDashboard({super.key});

  @override
  State<BreederDashboard> createState() => _BreederDashboardState();
}

class _BreederDashboardState extends State<BreederDashboard> {
  int _selectedIndex = 0;

  void _onItemTapped(int index) {
    if (index == 2) {
       Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
       return;
    }
    setState(() => _selectedIndex = index);
  }

  void _logout() async {
    await AuthService().logout();
    if (mounted) {
      Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginScreen()), (r) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(
         title: const Text('Breeder Portal', style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
         backgroundColor: Colors.transparent,
         elevation: 0,
         iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
         actions: [
            IconButton(icon: const Icon(Icons.logout, color: Color(0xFF5C4033)), onPressed: _logout)
         ]
      ),
      body: _selectedIndex == 1 ? const LicenseStatusScreen() : FutureBuilder<Map<String, dynamic>>(
        future: LicenseService().getLicenseDashboard(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
             return const Center(child: CircularProgressIndicator(color: Color(0xFF5C4033)));
          }
          final String complianceInfo = snapshot.hasData ? (snapshot.data!['complianceStatus'] ?? 'Not Evaluated') : 'Fetch Error';
          
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Padding(
                padding: EdgeInsets.all(24.0),
                child: Row(
                  children: [
                    Icon(Icons.workspace_premium, size: 50, color: Color(0xFFDEC49B)),
                    SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Breeder Central", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                          Text("Licensing & Authority Operations", style: TextStyle(color: Color(0xFF9E6D4E))),
                        ],
                      ),
                    ),
                  ],
                )
              ),
              
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 24),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF5C4033),
                  borderRadius: BorderRadius.circular(16)
                ),
                child: Row(
                   mainAxisAlignment: MainAxisAlignment.spaceBetween,
                   children: [
                     const Text("Status Check:", style: TextStyle(color: Colors.white, fontSize: 16)),
                     Text(complianceInfo, style: const TextStyle(color: Color(0xFFDEC49B), fontWeight: FontWeight.bold, fontSize: 16))
                   ]
                )
              ),
              const SizedBox(height: 24),
              Expanded(
                child: GridView.count(
                  padding: const EdgeInsets.symmetric(horizontal: 24.0),
                  crossAxisCount: 2,
                  crossAxisSpacing: 16,
                  mainAxisSpacing: 16,
                  childAspectRatio: 1.0,
                  children: [
                    _buildAdminCard("Apply\nNew License", Icons.edit_document, const Color(0xFF9E6D4E), Colors.white, () async {
                       await Navigator.push(context, MaterialPageRoute(builder: (_) => const ApplyLicenseScreen()));
                       setState(() {}); // Refresh dashboard softly
                    }),
                    _buildAdminCard("Track\nApplications", Icons.timeline, const Color(0xFFDEC49B), const Color(0xFF5C4033), () {
                       setState(() => _selectedIndex = 1);
                    }),
                  ]
                ),
              )
            ],
          );
        }
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          boxShadow: [BoxShadow(color: Colors.black26, blurRadius: 15, spreadRadius: 0, offset: Offset(0, -2))],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
          child: BottomNavigationBar(
            backgroundColor: const Color(0xFF5C4033),
            type: BottomNavigationBarType.fixed,
            selectedItemColor: const Color(0xFFDEC49B),
            unselectedItemColor: Colors.white54,
            currentIndex: _selectedIndex,
            onTap: _onItemTapped,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(icon: Icon(Icons.edit_document), label: 'Applications'),
              BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAdminCard(String title, IconData icon, Color bgColor, Color textColor, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [BoxShadow(color: Colors.black.withAlpha(20), spreadRadius: 1, blurRadius: 10, offset: const Offset(0, 5))]
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 48, color: textColor),
            const SizedBox(height: 12),
            Text(title, textAlign: TextAlign.center, style: TextStyle(color: textColor, fontWeight: FontWeight.bold, fontSize: 16)),
          ]
        ),
      )
    );
  }
}
