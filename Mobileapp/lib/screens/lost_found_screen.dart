import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/lost_and_found_service.dart';

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
      body: FutureBuilder<List<dynamic>>(
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
             padding: const EdgeInsets.all(20),
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
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppTheme.activeOrange,
        child: const Icon(Icons.add_alert, color: Colors.white),
        onPressed: () {},
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
