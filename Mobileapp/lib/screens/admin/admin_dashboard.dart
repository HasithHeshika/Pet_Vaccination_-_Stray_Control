import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../login_screen.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _selectedIndex = 0;

  void _onItemTapped(int index) {
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
         title: const Text('Admin Console', style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
         backgroundColor: Colors.transparent,
         elevation: 0,
         iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
         actions: [
            IconButton(icon: const Icon(Icons.logout, color: Color(0xFF5C4033)), onPressed: _logout)
         ]
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Padding(
            padding: EdgeInsets.all(24.0),
            child: Row(
              children: [
                Icon(Icons.admin_panel_settings, size: 50, color: Color(0xFF8B5A2B)),
                SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text("Hello, Administrator", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                      Text("Central Command Dashboard", style: TextStyle(color: Color(0xFF9E6D4E))),
                    ],
                  ),
                ),
              ],
            )
          ),
          
          Expanded(
            child: GridView.count(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              crossAxisCount: 2,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.0,
              children: [
                _buildAdminCard(context, "Manage\nUsers", Icons.people_alt, const Color(0xFF5C4033), Colors.white),
                _buildAdminCard(context, "Pet\nRegistry", Icons.pets, const Color(0xFF9E6D4E), Colors.white),
                _buildAdminCard(context, "Verify\nLicenses", Icons.workspace_premium, const Color(0xFFDEC49B), const Color(0xFF5C4033)),
                _buildAdminCard(context, "Vaccine\nLedgers", Icons.vaccines, const Color(0xFFFFFDF5), const Color(0xFF5C4033)),
              ]
            ),
          )
        ],
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
              BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Console'),
              BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Users'),
              BottomNavigationBarItem(icon: Icon(Icons.pets), label: 'All Pets'),
              BottomNavigationBarItem(icon: Icon(Icons.shield), label: 'Authority'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildAdminCard(BuildContext context, String title, IconData icon, Color bgColor, Color textColor) {
    return GestureDetector(
      onTap: () => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$title requires Web Admin Portal."))),
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
