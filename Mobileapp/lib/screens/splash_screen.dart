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
    // Artificial delay to show the splash screen
    await Future.delayed(const Duration(seconds: 2));
    
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token'); // Check local persistent memory
    
    if (mounted) {
      if (token != null && token.isNotEmpty) {
        // Validate token with server to prevent expired/invalid session (401)
        Map<String, dynamic>? meData;
        try {
          meData = await AuthService().getMe();
        } catch (_) {
          meData = null;
        }

        if (meData == null) {
          // Token is expired or invalid on the server (401)
          await AuthService().logout();
          if (mounted) {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(builder: (_) => const LoginScreen()),
            );
          }
          return;
        }

        String role = meData['user']?['role'] ?? prefs.getString('role') ?? 'pet_owner';
        await prefs.setString('role', role);
        
        Widget target = const HomeScreen();
        if (role == 'admin') {
          target = const AdminDashboard();
        } else if (role == 'veterinarian') {
          target = const VetDashboard();
        } else if (role == 'breeder') {
          target = const BreederDashboard();
        }

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
            // Circular Dog Illustration
            Container(
              width: 170,
              height: 170,
              decoration: const BoxDecoration(
                shape: BoxShape.circle,
                color: Color(0xFFDEC49B), // Soft Gold
              ),
              child: ClipOval(
                child: Image.asset(
                  'assets/images/puppy.png',
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.pets, size: 80, color: Color(0xFF5C4033)),
                ),
              ),
            ),
            const SizedBox(height: 36),
            
            // App Title Matching Brand
            const Text(
              "PetNexus",
              style: TextStyle(
                fontFamily: 'serif',
                fontSize: 44,
                fontWeight: FontWeight.bold,
                color: Color(0xFFDEC49B),
                letterSpacing: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            
            // Subtitle Tagline
            const Text(
              "Vaccinations & Stray Control",
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w400,
                color: Colors.white70,
                letterSpacing: 0.8,
              ),
            ),
            
            const SizedBox(height: 48),
            // Sleek Loading Indicator
            const CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFDEC49B)),
              strokeWidth: 3,
            )
          ],
        ),
      ),
    );
  }
}
