import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/stray_service.dart';

class ReportStrayScreen extends StatefulWidget {
  const ReportStrayScreen({super.key});

  @override
  State<ReportStrayScreen> createState() => _ReportStrayScreenState();
}

class _ReportStrayScreenState extends State<ReportStrayScreen> {
  final _locationController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _imageController = TextEditingController(); // Simulating image upload via URL
  bool _isLoading = false;

  void _submitReport() async {
    if (_locationController.text.isEmpty || _descriptionController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Location and Description are required")));
      return;
    }

    setState(() => _isLoading = true);
    try {
      await StrayService().reportStray({
        "location": _locationController.text,
        "description": _descriptionController.text,
        "image": _imageController.text.isNotEmpty ? _imageController.text : null,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Stray reported successfully.")));
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(
        title: const Text("Report a Stray", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            const Icon(Icons.add_location_alt, size: 80, color: Color(0xFF8B5A2B)),
            const SizedBox(height: 16),
            const Text("Help us locate and rescue stray animals in your community.", textAlign: TextAlign.center, style: TextStyle(color: Color(0xFF9E6D4E), fontSize: 16)),
            const SizedBox(height: 32),
            TextField(
              controller: _locationController,
              decoration: _buildInputDecoration("Approximate Location (Street/City)", Icons.map),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: _buildInputDecoration("Animal Description & Condition", Icons.description),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _imageController,
              decoration: _buildInputDecoration("Image URL (Optional)", Icons.link),
            ),
            const SizedBox(height: 48),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submitReport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5C4033),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                ),
                child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("SUBMIT REPORT", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              ),
            )
          ]
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration(String labelText, IconData icon) {
    return InputDecoration(
      labelText: labelText,
      labelStyle: const TextStyle(color: AppTheme.primaryBrown),
      prefixIcon: Icon(icon, color: AppTheme.primaryBrown),
      filled: true,
      fillColor: Colors.white,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFDECAAE), width: 1.5),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF5C4033), width: 2.0),
      ),
    );
  }
}
