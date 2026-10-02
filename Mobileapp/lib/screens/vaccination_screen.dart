import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class VaccinationScreen extends StatelessWidget {
  const VaccinationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Vaccination Health"),
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text("Upcoming Reminders", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBrown)),
          const SizedBox(height: 12),
          _buildHealthCard("Rabies Booster", "Overdue since 5 days! Please schedule an appointment.", Colors.red.shade100, Colors.red.shade800),
          const SizedBox(height: 16),
          const Text("History", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryBrown)),
          const SizedBox(height: 12),
          _buildHealthCard("DHPP Vaccine", "Administered 6 months ago. Next due in 2025.", Colors.white, AppTheme.primaryText),
        ],
      ),
    );
  }

  Widget _buildHealthCard(String title, String subtitle, Color bgColor, Color textColor) {
    return Card(
      color: bgColor,
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Icon(Icons.medical_services, size: 40, color: textColor),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: textColor)),
        subtitle: Text(subtitle, style: TextStyle(color: textColor.withOpacity(0.8))),
      ),
    );
  }
}
