import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../login_screen.dart';

class BreederDashboard extends StatefulWidget {
  const BreederDashboard({super.key});

  @override
  State<BreederDashboard> createState() => _BreederDashboardState();
}

class _BreederDashboardState extends State<BreederDashboard> {
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
         title: const Text('Breeder Portal', style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
         backgroundColor: Colors.transparent,
         elevation: 0,
         iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
         actions: [
            IconButton(icon: const Icon(Icons.logout, color: Color(0xFF5C4033)), onPressed: _logout)
         ]
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.workspace_premium, size: 80, color: Color(0xFF8B5A2B)),
            SizedBox(height: 16),
            Text("Breeder Operations", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
            Padding(padding: EdgeInsets.all(32.0), child: Text("Breeder applications and active licensing documents will populate here.", textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF9E6D4E)))),
          ],
        ),
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
}
