import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/vaccination_service.dart';

class VaccinationScreen extends StatefulWidget {
  const VaccinationScreen({super.key});

  @override
  State<VaccinationScreen> createState() => _VaccinationScreenState();
}

class _VaccinationScreenState extends State<VaccinationScreen> {
  late Future<List<dynamic>> _vaccinationsFuture;

  @override
  void initState() {
    super.initState();
    _vaccinationsFuture = VaccinationService().getUpcomingUserVaccinations();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Vaccination Health"),
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _vaccinationsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.primaryBrown));
          }
          if (snapshot.hasError) {
             return Center(child: Text("Error fetching records. Backend might not support /user/upcoming.", textAlign: TextAlign.center, style: TextStyle(color: AppTheme.primaryBrown)));
          }
           
          final records = snapshot.data ?? [];
          
          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              const Text("Upcoming Reminders", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBrown)),
              const SizedBox(height: 12),
              if (records.isEmpty)
                 const Text("No upcoming vaccinations currently!", style: TextStyle(color: Colors.grey)),
              ...records.map((record) {
                 String vaxName = record['vaccineName'] ?? 'Unknown Vaccine';
                 String dateStr = record['dueDate'] ?? 'Unknown Date';
                 return _buildHealthCard(vaxName, "Due on $dateStr", Colors.red.shade100, Colors.red.shade800);
              }).toList(),
            ],
          );
        }
      ),
    );
  }

  Widget _buildHealthCard(String title, String subtitle, Color bgColor, Color textColor) {
    return Card(
      color: bgColor,
      margin: const EdgeInsets.only(bottom: 16),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Icon(Icons.medical_services, size: 40, color: textColor),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: textColor)),
        subtitle: Text(subtitle, style: TextStyle(color: textColor.withAlpha(200))),
      ),
    );
  }
}
