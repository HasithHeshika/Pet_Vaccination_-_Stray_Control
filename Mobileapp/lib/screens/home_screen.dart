import 'package:flutter/material.dart';
import 'pet_list_screen.dart';
import 'vaccination_screen.dart';
import 'profile_screen.dart';
import 'breeder/breeder_dashboard.dart';
import 'community_feed_screen.dart';
import 'adoption_screen.dart';
import 'breeding_match_screen.dart';
import 'report_lost_screen.dart';
import 'report_stray_screen.dart';
import 'lost_found_screen.dart';
import '../services/auth_service.dart';
import '../services/lost_and_found_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;
  late Future<List<dynamic>> _recentAlertsFuture;
  bool _hasUnreadNotifications = true;

  @override
  void initState() {
    super.initState();
    _recentAlertsFuture = _loadRecentAlerts();
  }

  Future<List<dynamic>> _loadRecentAlerts() async {
    try {
      final list = await LostAndFoundService().getLostAndFoundList();
      return list;
    } catch (_) {
      return [];
    }
  }

  void _onItemTapped(int index) {
    if (index == 0) return;

    Widget target;
    if (index == 1) {
      target = const PetListScreen();
    } else if (index == 2) {
      target = const CommunityFeedScreen();
    } else if (index == 3) {
      target = const ProfileScreen();
    } else {
      return;
    }

    Navigator.push(context, MaterialPageRoute(builder: (_) => target)).then((_) {
      if (mounted) setState(() => _selectedIndex = 0);
    });
  }

  void _showNotificationsSheet() {
    setState(() => _hasUnreadNotifications = false);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(22),
        decoration: const BoxDecoration(
          color: Color(0xFFFDFBF7),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 5,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
              ),
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.notifications_active, color: Color(0xFF8B5A2B), size: 24),
                    SizedBox(width: 10),
                    Text(
                      "Notifications & Alerts",
                      style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                    ),
                  ],
                ),
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text("Close", style: TextStyle(color: Color(0xFF8B5A2B), fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Notification item 1: Rabies reminder
            _buildNotificationItem(
              icon: Icons.vaccines,
              iconBg: const Color(0xFF5C4033),
              title: "Rabies Booster Reminder",
              desc: "Annual booster schedule updated. Check your pet's vaccination timetable.",
              time: "Today, 9:30 AM",
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const VaccinationScreen()));
              },
            ),
            const SizedBox(height: 10),

            // Notification item 2: Municipal patrol update
            _buildNotificationItem(
              icon: Icons.verified,
              iconBg: const Color(0xFF2E7D32),
              title: "Municipal Patrol Dispatched",
              desc: "Animal control unit assigned vehicle #04 for Reid Ave stray sighting.",
              time: "1 hour ago",
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const CommunityFeedScreen()));
              },
            ),
            const SizedBox(height: 10),

            // Notification item 3: Lost pet alert
            _buildNotificationItem(
              icon: Icons.search,
              iconBg: const Color(0xFF8B2500),
              title: "Missing Pet Broadcast",
              desc: "A golden retriever 'Buddy' was reported missing in your neighborhood.",
              time: "Yesterday",
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const LostFoundScreen()));
              },
            ),
            const SizedBox(height: 18),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: OutlinedButton(
                onPressed: () {
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("All notifications marked as read.")),
                  );
                },
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFFDEC49B), width: 1.5),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text("Mark All as Read", style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationItem({
    required IconData icon,
    required Color iconBg,
    required String title,
    required String desc,
    required String time,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEADBC8)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 18,
              backgroundColor: iconBg,
              child: Icon(icon, color: Colors.white, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5, color: Color(0xFF5C4033))),
                      Text(time, style: const TextStyle(fontSize: 10.5, color: Colors.grey)),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(desc, style: const TextStyle(fontSize: 12, color: Color(0xFF7A6458), height: 1.35)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showRegistrationInfoModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Color(0xFFFDFBF7),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 48,
                height: 5,
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFDEC49B),
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFDEC49B).withAlpha(80),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.shield_outlined, color: Color(0xFF5C4033), size: 28),
                ),
                const SizedBox(width: 14),
                const Expanded(
                  child: Text(
                    "Official Pet Registration",
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF5C4033),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 18),
            const Text(
              "Pet registration is managed with municipal authorities and certified veterinarians to maintain verified health and rabies vaccination records.",
              style: TextStyle(fontSize: 14, height: 1.45, color: Color(0xFF6B4E3D)),
            ),
            const SizedBox(height: 20),
            _buildStepItem(
              number: "1",
              title: "Visit Authorized Vet or Council",
              desc: "Take your pet to your local municipal veterinarian for registration, rabies vaccination, and microchipping.",
            ),
            const SizedBox(height: 14),
            _buildStepItem(
              number: "2",
              title: "Authority Issues Digital Profile",
              desc: "The administrator enters your pet records into the centralized PetNexus national registry.",
            ),
            const SizedBox(height: 14),
            _buildStepItem(
              number: "3",
              title: "Access Digital QR Passport",
              desc: "Your pet immediately appears under 'My Pets' with a downloadable QR collar tag and automated booster schedule.",
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5C4033),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text("Understood", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(height: 10),
          ],
        ),
      ),
    );
  }

  Widget _buildStepItem({required String number, required String title, required String desc}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 14,
          backgroundColor: const Color(0xFFDEC49B),
          child: Text(number, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
              const SizedBox(height: 3),
              Text(desc, style: const TextStyle(fontSize: 13, height: 1.35, color: Color(0xFF7A6458))),
            ],
          ),
        )
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9), // Light cream
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header Image, Greeting and Notification Icon
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
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
                        const CircleAvatar(
                          radius: 26,
                          backgroundImage: AssetImage('assets/images/dashboard_cat.png'),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                "Hello there,",
                                style: TextStyle(fontSize: 14, color: Color(0xFF5C4033)),
                              ),
                              Row(
                                children: [
                                  Flexible(
                                    child: Text(
                                      name,
                                      style: const TextStyle(fontSize: 21, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
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
                        Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF9E6D4E)),
                              child: IconButton(
                                icon: const Icon(Icons.notifications_none, color: Colors.white, size: 22),
                                onPressed: _showNotificationsSheet,
                              ),
                            ),
                            if (_hasUnreadNotifications)
                              Positioned(
                                top: 2,
                                right: 2,
                                child: Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: Color(0xFFD4A373),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ),
                          ],
                        )
                      ],
                    );
                  },
                ),
              ),

              // 1. Welcoming Quotes / Banner (FIRST)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 6.0),
                child: Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF8B5A2B), // Existing theme primary brown
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFDEC49B), width: 1.5),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(25),
                        spreadRadius: 1,
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      )
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.pets, color: Color(0xFFDEC49B), size: 20),
                          SizedBox(width: 8),
                          Text(
                            "Welcome to PetNexus",
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 0.5,
                            ),
                          ),
                          SizedBox(width: 8),
                          Icon(Icons.pets, color: Color(0xFFDEC49B), size: 20),
                        ],
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        "“Until one has loved an animal, a part of one's soul remains unawakened.”",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Color(0xFFF9EED9),
                          fontSize: 13.5,
                          height: 1.4,
                          fontStyle: FontStyle.italic,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white.withAlpha(25),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          "Your community shield for pet safety, health & welfare",
                          style: TextStyle(
                            color: Color(0xFFDEC49B),
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // 2. Lost Pet and Report Stray Buttons (SECOND - In existing theme colors with identifying borders)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
                child: Row(
                  children: [
                    // Lost a Pet Button: Rich warm brown with a prominent Gold border
                    Expanded(
                      child: InkWell(
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportLostScreen())),
                        borderRadius: BorderRadius.circular(18),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B5A2B), // Primary brown
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFDEC49B), width: 2.5), // Distinct Gold border
                            boxShadow: [
                              BoxShadow(color: Colors.black.withAlpha(25), blurRadius: 8, offset: const Offset(0, 3)),
                            ],
                          ),
                          child: const Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: Color(0xFFDEC49B),
                                child: Icon(Icons.search, color: Color(0xFF5C4033), size: 20),
                              ),
                              SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Lost a Pet?",
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      "Broadcast alert",
                                      style: TextStyle(color: Color(0xFFF9EED9), fontSize: 11),
                                    ),
                                  ],
                                ),
                              )
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Report Stray Button: Deep espresso brown with a contrasting Tan/Gold border
                    Expanded(
                      child: InkWell(
                        onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportStrayScreen())),
                        borderRadius: BorderRadius.circular(18),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
                          decoration: BoxDecoration(
                            color: const Color(0xFF5C4033), // Deep espresso brown
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFD4A373), width: 2.5), // Distinct Tan/Gold border
                            boxShadow: [
                              BoxShadow(color: Colors.black.withAlpha(25), blurRadius: 8, offset: const Offset(0, 3)),
                            ],
                          ),
                          child: const Row(
                            children: [
                              CircleAvatar(
                                radius: 18,
                                backgroundColor: Color(0xFF9E6D4E),
                                child: Icon(Icons.location_on, color: Colors.white, size: 20),
                              ),
                              SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      "Report Stray",
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                    ),
                                    SizedBox(height: 2),
                                    Text(
                                      "Alert city & area",
                                      style: TextStyle(color: Color(0xFFDEC49B), fontSize: 11),
                                    ),
                                  ],
                                ),
                              )
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              // 3. Quick Actions Header
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 14, 20, 10),
                child: Text(
                  "Quick Actions",
                  style: TextStyle(color: Color(0xFF8B5A2B), fontSize: 21, fontWeight: FontWeight.bold),
                ),
              ),

              // 4. Quick Actions Grid (6 Dedicated Cards)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: 1.05,
                  children: [
                    // 1. View My Pets
                    _buildActionCard(
                      title: "View My Pets",
                      subtitle: "Registered IDs & QR codes",
                      iconWidget: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: const Color(0xFFD4A373), width: 2),
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(50),
                          child: Image.asset('assets/images/kitten_puppy.png', width: 52, height: 52, fit: BoxFit.cover),
                        ),
                      ),
                      bgColor: const Color(0xFF9E6D4E),
                      textColor: Colors.white,
                      subtextColor: Colors.white70,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PetListScreen())),
                    ),

                    // 2. Vaccination Schedule
                    _buildActionCard(
                      title: "Vaccination\nSchedule",
                      subtitle: "Booster alerts & logs",
                      iconWidget: const Stack(
                        children: [
                          Icon(Icons.vaccines, color: Color(0xFFDECAAE), size: 46),
                          Positioned(right: -3, bottom: -3, child: Icon(Icons.calendar_month, color: Color(0xFFDECAAE), size: 20))
                        ],
                      ),
                      bgColor: const Color(0xFF5C4033),
                      textColor: Colors.white,
                      subtextColor: Colors.white70,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VaccinationScreen())),
                    ),

                    // 3. DEDICATED TAB: Pet Adoption
                    _buildActionCard(
                      title: "Pet Adoption",
                      subtitle: "Find forever companions",
                      iconWidget: const Stack(
                        children: [
                          Icon(Icons.home_rounded, color: Color(0xFF5C4033), size: 46),
                          Positioned(right: -3, bottom: -3, child: Icon(Icons.pets, color: Color(0xFF8B5A2B), size: 22))
                        ],
                      ),
                      bgColor: const Color(0xFFFFFDF5),
                      textColor: const Color(0xFF5C4033),
                      subtextColor: const Color(0xFF8B6B52),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdoptionScreen())),
                    ),

                    // 4. DEDICATED TAB: Breeding Match
                    _buildActionCard(
                      title: "Breeding Match",
                      subtitle: "Verified stud & pedigree",
                      iconWidget: const Stack(
                        children: [
                          Icon(Icons.favorite_rounded, color: Color(0xFF9E6D4E), size: 46),
                          Positioned(right: -3, bottom: -3, child: Icon(Icons.workspace_premium, color: Color(0xFF5C4033), size: 22))
                        ],
                      ),
                      bgColor: const Color(0xFFDEC49B),
                      textColor: const Color(0xFF5C4033),
                      subtextColor: const Color(0xFF7A583A),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BreedingMatchScreen())),
                    ),

                    // 5. Community Hub (Complaints & Lost Pets)
                    _buildActionCard(
                      title: "Community\nHub",
                      subtitle: "Complaints & lost pet ads",
                      iconWidget: const Stack(
                        children: [
                          Icon(Icons.campaign, color: Color(0xFFDEC49B), size: 46),
                          Positioned(right: -4, bottom: -3, child: Icon(Icons.search, color: Colors.white, size: 20))
                        ],
                      ),
                      bgColor: const Color(0xFF8B5A2B),
                      textColor: Colors.white,
                      subtextColor: Colors.white70,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const CommunityFeedScreen())),
                    ),

                    // 6. Breeder Licensing & Services
                    _buildActionCard(
                      title: "Breeder &\nServices",
                      subtitle: "Apply & verify license",
                      iconWidget: const Stack(
                        children: [
                          Icon(Icons.badge, color: Color(0xFF5C4033), size: 46),
                          Positioned(right: -3, bottom: -3, child: Icon(Icons.check_circle, color: Color(0xFF8B5A2B), size: 20))
                        ],
                      ),
                      bgColor: const Color(0xFFF9EED9),
                      textColor: const Color(0xFF5C4033),
                      subtextColor: const Color(0xFF8B6B52),
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const BreederDashboard())),
                    ),
                  ],
                ),
              ),

              // 5. The 3 Readable Sections (AFTER Quick Actions)
              const Padding(
                padding: EdgeInsets.fromLTRB(20, 24, 20, 10),
                child: Text(
                  "Explore & Learn",
                  style: TextStyle(color: Color(0xFF8B5A2B), fontSize: 19, fontWeight: FontWeight.bold),
                ),
              ),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: Column(
                  children: [
                    // Section 1: How Pet Registration Works
                    _buildReadableSectionCard(
                      icon: Icons.shield_outlined,
                      iconBg: const Color(0xFFDEC49B),
                      iconColor: const Color(0xFF5C4033),
                      title: "How Pet Registration Works",
                      description: "Official process with municipal veterinarians, microchip tracking, and digital QR passports.",
                      actionText: "Read Process",
                      onTap: _showRegistrationInfoModal,
                    ),
                    const SizedBox(height: 10),

                    // Section 2: Report Stray Animal
                    _buildReadableSectionCard(
                      icon: Icons.warning_amber_rounded,
                      iconBg: const Color(0xFF9E6D4E),
                      iconColor: Colors.white,
                      title: "Report a Stray Animal",
                      description: "Alert municipal teams & neighbors about abandoned or aggressive animals needing shelter.",
                      actionText: "Report Now",
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportStrayScreen())),
                    ),
                    const SizedBox(height: 10),

                    // Section 3: Browse Pet Adoptions (points to AdoptionScreen)
                    _buildReadableSectionCard(
                      icon: Icons.favorite_border,
                      iconBg: const Color(0xFF8B5A2B),
                      iconColor: const Color(0xFFDEC49B),
                      title: "Browse Pet Adoptions",
                      description: "Discover verified rescued pets and puppies in your city looking for a loving home.",
                      actionText: "View Pets",
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AdoptionScreen())),
                    ),
                  ],
                ),
              ),

              // 6. Live Neighborhood Alerts Section
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.campaign_outlined, color: Color(0xFF8B5A2B), size: 22),
                        SizedBox(width: 8),
                        Text(
                          "Live Neighborhood Alerts",
                          style: TextStyle(color: Color(0xFF8B5A2B), fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    TextButton(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LostFoundScreen())),
                      child: const Text("View All", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold, fontSize: 13)),
                    )
                  ],
                ),
              ),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                child: FutureBuilder<List<dynamic>>(
                  future: _recentAlertsFuture,
                  builder: (context, snapshot) {
                    if (snapshot.connectionState == ConnectionState.waiting) {
                      return Container(
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(color: Colors.white.withAlpha(150), borderRadius: BorderRadius.circular(16)),
                        child: const Center(child: CircularProgressIndicator(color: Color(0xFF8B5A2B))),
                      );
                    }

                    final reports = snapshot.data ?? [];
                    if (reports.isEmpty) {
                      return Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFFDF8),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: const Color(0xFFEADBC8)),
                        ),
                        child: const Row(
                          children: [
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: Color(0xFFEADBC8),
                              child: Icon(Icons.check_circle_outline, color: Color(0xFF5C4033), size: 24),
                            ),
                            SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "All Quiet in Your Area 🐾",
                                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF5C4033)),
                                  ),
                                  SizedBox(height: 3),
                                  Text(
                                    "No urgent missing pets or stray warnings in your neighborhood.",
                                    style: TextStyle(fontSize: 12, color: Color(0xFF7A6458)),
                                  ),
                                ],
                              ),
                            )
                          ],
                        ),
                      );
                    }

                    return SizedBox(
                      height: 145,
                      child: ListView.builder(
                        scrollDirection: Axis.horizontal,
                        physics: const BouncingScrollPhysics(),
                        itemCount: reports.length > 5 ? 5 : reports.length,
                        itemBuilder: (context, index) {
                          final item = reports[index];
                          final String title = item['petName'] ?? item['title'] ?? 'Missing Pet';
                          final String location = item['lastSeenLocation'] ?? 'Area not specified';
                          final String status = item['status'] ?? item['type'] ?? 'Lost';
                          final bool isLost = status.toLowerCase() == 'lost';

                          return Container(
                            width: 220,
                            margin: const EdgeInsets.only(right: 12, bottom: 6),
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(18),
                              border: Border.all(color: const Color(0xFFDEC49B), width: 1.2),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withAlpha(15), blurRadius: 6, offset: const Offset(0, 3))
                              ],
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: isLost ? const Color(0xFFF5EBE1) : const Color(0xFFEBF3EA),
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: isLost ? const Color(0xFF8B5A2B) : const Color(0xFF5C8A54),
                                          width: 1,
                                        ),
                                      ),
                                      child: Text(
                                        isLost ? "🐾 MISSING" : "✅ FOUND",
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.bold,
                                          color: isLost ? const Color(0xFF8B5A2B) : const Color(0xFF2E7D32),
                                        ),
                                      ),
                                    ),
                                    const Spacer(),
                                    const Icon(Icons.arrow_forward_ios, size: 12, color: Color(0xFF8B5A2B)),
                                  ],
                                ),
                                Text(
                                  title,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF5C4033)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Row(
                                  children: [
                                    const Icon(Icons.location_on, size: 13, color: Color(0xFF9E6D4E)),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(
                                        location,
                                        style: const TextStyle(fontSize: 12, color: Color(0xFF7A6458)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  ],
                                ),
                                InkWell(
                                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LostFoundScreen())),
                                  child: const Text(
                                    "Tap to view details",
                                    style: TextStyle(color: Color(0xFF8B5A2B), fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 28),
            ],
          ),
        ),
      ),

      // Bottom Navigation Bar
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
            selectedItemColor: const Color(0xFFDEC49B),
            unselectedItemColor: Colors.white54,
            selectedFontSize: 12,
            unselectedFontSize: 12,
            currentIndex: _selectedIndex,
            showUnselectedLabels: true,
            onTap: _onItemTapped,
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
              BottomNavigationBarItem(icon: Icon(Icons.pets), label: 'My Pets'),
              BottomNavigationBarItem(icon: Icon(Icons.favorite), label: 'Community'),
              BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildReadableSectionCard({
    required IconData icon,
    required Color iconBg,
    required Color iconColor,
    required String title,
    required String description,
    required String actionText,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFDEC49B), width: 1.2),
          boxShadow: [
            BoxShadow(color: Colors.black.withAlpha(12), blurRadius: 6, offset: const Offset(0, 2))
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: iconBg,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: iconColor, size: 22),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF5C4033),
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    description,
                    style: const TextStyle(
                      fontSize: 12,
                      height: 1.35,
                      color: Color(0xFF7A6458),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Text(
                        actionText,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF8B5A2B),
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.arrow_forward, size: 12, color: Color(0xFF8B5A2B)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionCard({
    required String title,
    required String subtitle,
    required Widget iconWidget,
    required Color bgColor,
    required Color textColor,
    required Color subtextColor,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(22),
          boxShadow: [
            BoxShadow(color: Colors.black.withAlpha(20), spreadRadius: 1, blurRadius: 8, offset: const Offset(0, 4))
          ],
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            iconWidget,
            const SizedBox(height: 8),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13.5, fontWeight: FontWeight.bold, color: textColor, height: 1.2),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 9.5, color: subtextColor),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }
}
