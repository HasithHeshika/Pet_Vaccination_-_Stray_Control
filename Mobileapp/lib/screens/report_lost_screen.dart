import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/lost_and_found_service.dart';

class ReportLostScreen extends StatefulWidget {
  const ReportLostScreen({super.key});

  @override
  State<ReportLostScreen> createState() => _ReportLostScreenState();
}

class _ReportLostScreenState extends State<ReportLostScreen> {
  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _locationController = TextEditingController();
  final _imageController = TextEditingController();
  String _type = 'Lost';
  bool _isLoading = false;

  void _submitReport() async {
    if (_titleController.text.isEmpty || _descriptionController.text.isEmpty || _locationController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all required fields")));
      return;
    }

    setState(() => _isLoading = true);
    try {
      await LostAndFoundService().reportLost({
        "petName": _titleController.text, // Fallbacks matching the backend schemas
        "title": _titleController.text,
        "description": _descriptionController.text,
        "location": _locationController.text,
        "type": _type,
        "status": _type,
        "imageUrl": _imageController.text.isNotEmpty ? _imageController.text : null,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Successfully created $_type report.")));
        Navigator.pop(context, true); // Return true to trigger refresh on underlying list
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
        title: const Text("Lost & Found Report", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildToggleButton('Lost'),
                const SizedBox(width: 16),
                _buildToggleButton('Found'),
              ],
            ),
            const SizedBox(height: 32),
            TextField(
              controller: _titleController,
              decoration: _buildInputDecoration("Title / Pet Name", Icons.pets),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _locationController,
              decoration: _buildInputDecoration("Last Known Location", Icons.location_on),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _descriptionController,
              maxLines: 3,
              decoration: _buildInputDecoration("Description (Collar, breed, size)", Icons.notes),
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
                  backgroundColor: _type == 'Lost' ? const Color(0xFF8B3A3A) : const Color(0xFF5C4033),
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

  Widget _buildToggleButton(String type) {
    bool isSelected = _type == type;
    return GestureDetector(
      onTap: () => setState(() => _type = type),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? (type == 'Lost' ? const Color(0xFF8B3A3A) : const Color(0xFF5C4033)) : Colors.transparent,
          border: Border.all(color: const Color(0xFF5C4033), width: 2),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Text(
          type.toUpperCase(),
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF5C4033),
            fontWeight: FontWeight.bold
          )
        )
      )
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
