import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'login_screen.dart';

class GetStartedScreen extends StatelessWidget {
  const GetStartedScreen({super.key});

  Future<void> _completeOnboarding(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('hasSeenOnboarding', true);
    if (!context.mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (_) => const LoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAF7F2), // Light cream background wrapping
      body: Stack(
        children: [
          // Background Image mapping (covering full screen to prevent clipping edge)
          Positioned.fill(
            child: Image.asset(
              'assets/images/get_started_bg.png', 
              fit: BoxFit.cover,
              alignment: Alignment.topCenter,
              errorBuilder: (context, error, stackTrace) {
                return Image.asset(
                  'assets/images/login_dog.png',
                  fit: BoxFit.cover,
                  alignment: Alignment.topCenter,
                );
              },
            ),
          ),
          
          SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                 // Top Left Icon + Title
                 Padding(
                   padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
                   child: Row(
                     children: [
                       ClipRRect(
                         borderRadius: BorderRadius.circular(12),
                         child: Image.asset(
                           'assets/images/dashboard_cat.png',
                           width: 52,
                           height: 52,
                           fit: BoxFit.cover,
                         ),
                       ),
                       const SizedBox(width: 16),
                       const Text(
                         "PetNexus", 
                         style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Color(0xFF381C0F), letterSpacing: 1.2)
                       )
                     ],
                   ),
                 ),
                 
                 const Spacer(),
                 
                 // Texts
                 Padding(
                   padding: const EdgeInsets.symmetric(horizontal: 32.0),
                   child: Row(
                     crossAxisAlignment: CrossAxisAlignment.start,
                     children: [
                       const Icon(Icons.shield_outlined, color: Color(0xFF341708), size: 38),
                       const SizedBox(width: 12),
                       const Expanded(
                         child: Text(
                           "Pet Management\nSystem",
                           style: TextStyle(
                             fontSize: 38,
                             height: 1.15,
                             fontWeight: FontWeight.w900,
                             color: Color(0xFF341708), // Deep dark brown
                           ),
                         ),
                       ),
                     ],
                   ),
                 ),
                 const SizedBox(height: 16),
                 const Padding(
                   padding: EdgeInsets.symmetric(horizontal: 32.0),
                   child: Text(
                     "A comprehensive platform for managing pet ownership records, vaccination tracking, breeder licensing, and stray animal reporting.",
                     style: TextStyle(
                       fontSize: 16,
                       height: 1.4,
                       fontWeight: FontWeight.bold,
                       color: Color(0xFF341708),
                     ),
                   ),
                 ),
                 const SizedBox(height: 36),
                 
                 // Carousel dots indicator
                 Row(
                   mainAxisAlignment: MainAxisAlignment.center,
                   children: [
                     _buildDot(true),
                     const SizedBox(width: 10),
                     _buildDot(false),
                     const SizedBox(width: 10),
                     _buildDot(false),
                   ],
                 ),
                 
                 const SizedBox(height: 48),
                 
                 // Action Button
                 Padding(
                   padding: const EdgeInsets.symmetric(horizontal: 32.0),
                   child: GestureDetector(
                     onTap: () => _completeOnboarding(context),
                     child: Container(
                       height: 72,
                       decoration: BoxDecoration(
                         color: const Color(0xFF341708),
                         borderRadius: BorderRadius.circular(36),
                         boxShadow: [
                           BoxShadow(color: const Color(0xFF341708).withAlpha(60), blurRadius: 15, offset: const Offset(0, 8))
                         ]
                       ),
                       child: Stack(
                         children: [
                           Positioned(
                             left: 8,
                             top: 8,
                             bottom: 8,
                             child: Container(
                               width: 56,
                               decoration: const BoxDecoration(
                                 color: Color(0xFFD3A473), // Goldish color
                                 shape: BoxShape.circle,
                               ),
                               child: const Icon(Icons.pets, color: Color(0xFF341708), size: 26),
                             ),
                           ),
                           const Row(
                             mainAxisAlignment: MainAxisAlignment.center,
                             children: [
                               SizedBox(width: 40), // offset for visual balance
                               Text(
                                 "Begin Your Journey",
                                 style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                               ),
                               SizedBox(width: 16),
                               Icon(Icons.keyboard_double_arrow_right, color: Colors.white70, size: 22)
                             ],
                           )
                         ],
                       ),
                     ),
                   ),
                 ),
                 const SizedBox(height: 40),
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildDot(bool active) {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(
        color: active ? const Color(0xFF341708) : const Color(0xFFDCC8B3),
        shape: BoxShape.circle,
      ),
    );
  }
}
