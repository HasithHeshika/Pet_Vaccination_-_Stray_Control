import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/lost_and_found_service.dart';
import 'report_lost_screen.dart';
import 'report_stray_screen.dart';

class LostFoundScreen extends StatefulWidget {
  const LostFoundScreen({super.key});

  @override
  State<LostFoundScreen> createState() => _LostFoundScreenState();
}

class _LostFoundScreenState extends State<LostFoundScreen> {
  late Future<List<dynamic>> _reportsFuture;

  @override
  void initState() {
    super.initState();
    _reportsFuture = LostAndFoundService().getLostAndFoundList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Lost & Found"),
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFDEC49B), Color(0xFFF9EED9)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppTheme.secondaryGold, width: 2),
              boxShadow: [
                BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 10, offset: const Offset(0, 5))
              ]
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.search, size: 28, color: AppTheme.primaryBrown),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        "Lost or Found a Pet?",
                        style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppTheme.primaryBrown),
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 12),
                Text(
                  "If you lost your pet, we can help you reunite! Or, if you found a pet roaming around, you can help alert others here.",
                  style: TextStyle(fontSize: 15, color: AppTheme.primaryText, height: 1.4),
                ),
              ],
            ),
          ),
          Expanded(
            child: FutureBuilder<List<dynamic>>(
              future: _reportsFuture,
              builder: (context, snapshot) {
                 if (snapshot.connectionState == ConnectionState.waiting) {
                   return const Center(child: CircularProgressIndicator(color: AppTheme.primaryBrown));
                 } else if (snapshot.hasError) {
                   return Center(child: Text("Error fetching posts: ${snapshot.error}"));
                 } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
                   return const Center(child: Text("No missing pets currently. Yay!", style: TextStyle(color: AppTheme.primaryBrown)));
                 }

                 final reports = snapshot.data!;
                 return ListView.builder(
                   padding: const EdgeInsets.only(left: 20, right: 20, bottom: 20),
                   itemCount: reports.length,
                   itemBuilder: (context, index) {
                     final report = reports[index];
                     String title = report['petName'] ?? report['title'] ?? 'Unknown Pet';
                     String desc = report['description'] ?? 'No description';
                     bool isLost = report['type'] == 'Lost' || report['status'] == 'Lost';
                     String? imageUrl = report['imageUrl'] ?? report['photoUrl'];

                     return _buildLostCard(title, desc, imageUrl, isLost);
                   },
                 );
              }
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF5C4033),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text("Create Report", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () {
          showModalBottomSheet(
            context: context,
            backgroundColor: const Color(0xFFF9EED9),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            builder: (ctx) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text("Create Report", style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                    const SizedBox(height: 32),
                    ListTile(
                      leading: const CircleAvatar(backgroundColor: Color(0xFF8B3A3A), child: Icon(Icons.pets, color: Colors.white)),
                      title: const Text("Lost or Found Pet", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                      subtitle: const Text("Post to the community feed"),
                      onTap: () async {
                         Navigator.pop(ctx);
                         final result = await Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportLostScreen()));
                         if (result == true && mounted) {
                           setState(() => _reportsFuture = LostAndFoundService().getLostAndFoundList());
                         }
                      }
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      leading: const CircleAvatar(backgroundColor: Color(0xFF9E6D4E), child: Icon(Icons.add_location_alt, color: Colors.white)),
                      title: const Text("Report a Stray", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                      subtitle: const Text("Alert authorities to animals in need"),
                      onTap: () {
                         Navigator.pop(ctx);
                         Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportStrayScreen()));
                      }
                    ),
                    const SizedBox(height: 24),
                  ]
                )
              );
            }
          );
        },
      ),
    );
  }

  Widget _buildLostCard(String title, String description, String? imagePath, bool isLost) {
    ImageProvider imageProvider;
    if (imagePath != null && imagePath.startsWith('http')) {
      imageProvider = NetworkImage(imagePath);
    } else {
      imageProvider = const AssetImage('assets/images/login_dog.png');
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                child: Image(image: imageProvider, height: 180, width: double.infinity, fit: BoxFit.cover),
              ),
              Positioned(
                top: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                     color: isLost ? AppTheme.activeOrange : AppTheme.secondaryGold,
                     borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                     isLost ? "LOST" : "FOUND",
                     style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                ),
              )
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryText)),
                const SizedBox(height: 8),
                Text(description, style: const TextStyle(fontSize: 16, color: AppTheme.primaryBrown)),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 45)
                  ),
                  child: const Text("Contact Owner"),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
