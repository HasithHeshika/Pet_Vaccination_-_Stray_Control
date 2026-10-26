import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import 'admin/admin_dashboard.dart';
import 'vet/vet_dashboard.dart';
import 'breeder/breeder_dashboard.dart';
import '../services/auth_service.dart';
import 'login_screen.dart';
import 'home_screen.dart';
import 'get_started_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuthAndNavigate();
  }

  Future<void> _checkAuthAndNavigate() async {
    // Artificial delay to show the beautiful splash screen
    await Future.delayed(const Duration(seconds: 2));
    
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token'); // Check local persistent memory
    
    if (mounted) {
      if (token != null && token.isNotEmpty) {
        String role = prefs.getString('role') ?? '';

        // Refresh the role from the server so a stale cached role (e.g. an admin saved as 'user'
        // by an older app version) never sends someone to the wrong side of the app
        try {
          final meData = await AuthService().getMe();
          if (meData?['user'] is Map) {
            role = AuthService.effectiveRole(Map<String, dynamic>.from(meData!['user']));
            await prefs.setString('role', role);
          }
        } catch (_) {
          // Offline: keep the cached role
        }
        if (role.isEmpty) role = 'user';
        
        Widget target = const HomeScreen();
        if (role == 'admin') target = const AdminDashboard();
        else if (role == 'veterinarian') target = const VetDashboard();
        else if (role == 'breeder') target = const BreederDashboard();

        if (mounted) {
           Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => target));
        }
      } else {
        // If not logged in, check if they've seen the onboarding screen
        final hasSeenOnboarding = prefs.getBool('hasSeenOnboarding') ?? false;
        
        if (mounted) {
           if (!hasSeenOnboarding) {
             Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const GetStartedScreen()));
           } else {
             Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
           }
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF3D2314), // Dark espresso brown perfectly matching mockup
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Spacer(),
            // Clean Gold Native Icon instead of image
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFD4A373), width: 3),
              ),
              child: const Icon(
                Icons.pets,
                size: 80,
                color: Color(0xFFD4A373),
              ),
            ),
            const SizedBox(height: 32),
            // Title
            const Text(
              "PETNEXUS",
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                letterSpacing: 4.0,
                color: Color(0xFFD4A373), // Gold Color AppTheme.secondaryGold equivalent
              ),
            ),
            const SizedBox(height: 8),
            // Subtitle
            const Text(
              "INTEGRATED PET PLATFORM",
              style: TextStyle(
                fontSize: 14,
                letterSpacing: 2.0,
                fontWeight: FontWeight.w600,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 48),
            // Features list
            const Text("Secure QR Vaccination Records", style: TextStyle(color: Color(0xFFD4A373), fontSize: 13)),
            const SizedBox(height: 8),
            const Text("Community Stray Reporting", style: TextStyle(color: Color(0xFFD4A373), fontSize: 13)),
            const SizedBox(height: 8),
            const Text("Pet & Authority Registry", style: TextStyle(color: Color(0xFFD4A373), fontSize: 13)),
            const Spacer(),
            // Loading Indicator
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFD4A373)),
            ),
            const Spacer(),
            // Footer
            const Text(
              "© 2026 PetNexus Central",
              style: TextStyle(
                color: Colors.white54,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
