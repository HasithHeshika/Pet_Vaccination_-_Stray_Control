import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../utils/admin_ui.dart';
import '../login_screen.dart';
import 'admin_incidents_tab.dart';
import 'admin_licences_tab.dart';
import 'admin_overview_tab.dart';
import 'admin_pets_tab.dart';
import 'admin_users_tab.dart';

// Admin / municipal authority side of the app (separate from the pet owner screens)
class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  static const List<String> _titles = ['Admin Console', 'Users', 'Pets & Vaccinations', 'Breeder Licences', 'Animal Incidents'];

  int _selectedIndex = 0;
  // Bumped when the overview should reload after visiting another tab
  int _overviewVersion = 0;

  void _openTab(int index) {
    setState(() {
      if (index == 0 && _selectedIndex != 0) _overviewVersion++;
      _selectedIndex = index;
    });
  }

  Future<void> _logout() async {
    await AuthService().logout();
    if (mounted) {
      Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginScreen()), (r) => false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: adminCream,
      appBar: AppBar(
        title: Text(_titles[_selectedIndex], style: const TextStyle(color: adminBrown, fontWeight: FontWeight.bold)),
        backgroundColor: adminCream,
        elevation: 0,
        iconTheme: const IconThemeData(color: adminBrown),
        actions: [
          IconButton(icon: const Icon(Icons.logout, color: adminBrown), tooltip: 'Log out', onPressed: _logout),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          AdminOverviewTab(key: ValueKey('overview-$_overviewVersion'), onOpenTab: _openTab),
          const AdminUsersTab(),
          const AdminPetsTab(),
          const AdminLicencesTab(),
          const AdminIncidentsTab(),
        ],
      ),
      bottomNavigationBar: ClipRRect(
        borderRadius: const BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
        child: BottomNavigationBar(
          backgroundColor: adminBrown,
          type: BottomNavigationBarType.fixed,
          selectedItemColor: const Color(0xFFDEC49B),
          unselectedItemColor: Colors.white54,
          currentIndex: _selectedIndex,
          onTap: _openTab,
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Overview'),
            BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Users'),
            BottomNavigationBarItem(icon: Icon(Icons.pets), label: 'Pets'),
            BottomNavigationBarItem(icon: Icon(Icons.workspace_premium), label: 'Licences'),
            BottomNavigationBarItem(icon: Icon(Icons.report_problem), label: 'Incidents'),
          ],
        ),
      ),
    );
  }
}
