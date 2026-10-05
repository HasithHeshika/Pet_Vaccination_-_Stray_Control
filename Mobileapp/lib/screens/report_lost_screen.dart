import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/lost_and_found_service.dart';

class ReportLostScreen extends StatefulWidget {
  const ReportLostScreen({super.key});

  @override
  State<ReportLostScreen> createState() => _ReportLostScreenState();
}

class _ReportLostScreenState extends State<ReportLostScreen> {
  final _petNameController = TextEditingController();
  final _breedController = TextEditingController();
  final _colorController = TextEditingController();
  final _locationController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _imageController = TextEditingController();
  final _contactController = TextEditingController();
  
  DateTime? _lastSeenDate;
  String _type = 'Lost';
  bool _isLoading = false;

  void _submitReport() async {
    if (_petNameController.text.isEmpty ||
        _breedController.text.isEmpty ||
        _colorController.text.isEmpty ||
        _locationController.text.isEmpty ||
        _lastSeenDate == null ||
        _contactController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all required fields")));
      return;
    }

    setState(() => _isLoading = true);
    try {
      await LostAndFoundService().reportLost({
        "petName": _petNameController.text,
        "breed": _breedController.text,
        "color": _colorController.text,
        "lastSeenLocation": _locationController.text,
        "lastSeenDate": _lastSeenDate!.toIso8601String(),
        "description": _descriptionController.text,
        "contactInfo": _contactController.text,
        "type": _type,
        "status": _type,
        "imageUrl": _imageController.text.isNotEmpty ? _imageController.text : null,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Successfully created $_type report.")));
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _lastSeenDate ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: ThemeData.light().copyWith(
            colorScheme: const ColorScheme.light(
              primary: AppTheme.primaryBrown,
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null) {
      setState(() => _lastSeenDate = picked);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(
        title: const Text("Report a Missing Pet", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold, fontSize: 20)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Center(
              child: Text(
                "Please provide as much detail as possible to help identify the pet.",
                textAlign: TextAlign.center,
                style: TextStyle(color: AppTheme.primaryBrown, fontSize: 15),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildToggleButton('Lost'),
                const SizedBox(width: 16),
                _buildToggleButton('Found'),
              ],
            ),
            const SizedBox(height: 32),
            _buildLabel("Pet Name (or \"Unknown\" if found)"),
            TextField(
              controller: _petNameController,
              decoration: _buildInputDecoration("Enter pet name", Icons.pets),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel("Breed / Type"),
                      TextField(
                        controller: _breedController,
                        decoration: _buildInputDecoration("e.g. Golden Retriever", null),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildLabel("Color / Markings"),
                      TextField(
                        controller: _colorController,
                        decoration: _buildInputDecoration("e.g. Black with white spots", null),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildLabel("Last Seen Location"),
            TextField(
              controller: _locationController,
              decoration: _buildInputDecoration("e.g., Central Park near 72nd St entrance", Icons.location_on),
            ),
            const SizedBox(height: 16),
            _buildLabel("Last Seen Date"),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFDECAAE), width: 1.5),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.calendar_month, color: AppTheme.primaryBrown),
                    const SizedBox(width: 12),
                    Text(
                      _lastSeenDate != null
                          ? "${_lastSeenDate!.month}/${_lastSeenDate!.day}/${_lastSeenDate!.year}"
                          : "mm/dd/yyyy",
                      style: TextStyle(
                        fontSize: 16,
                        color: _lastSeenDate != null ? Colors.black87 : Colors.black54,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            _buildLabel("Additional Description"),
            TextField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: _buildInputDecoration("Describe any collar, tags, behaviors, etc.", null),
            ),
            const SizedBox(height: 16),
            _buildLabel("Photo URL (Optional)"),
            TextField(
              controller: _imageController,
              decoration: _buildInputDecoration("https://example.com/pet-image.jpg", Icons.link),
            ),
            const SizedBox(height: 16),
            _buildLabel("Contact Information"),
            TextField(
              controller: _contactController,
              decoration: _buildInputDecoration("Phone number or email", Icons.contact_phone),
            ),
            const SizedBox(height: 48),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: const BorderSide(color: AppTheme.primaryBrown, width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text("Cancel", style: TextStyle(color: AppTheme.primaryBrown, fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _submitReport,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blueAccent.shade700,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                    ),
                    child: _isLoading 
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                        : const Text("Submit Report", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                  ),
                ),
              ],
            )
          ]
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.bold,
          color: Color(0xFF333333),
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

  InputDecoration _buildInputDecoration(String hintText, IconData? icon) {
    return InputDecoration(
      hintText: hintText,
      hintStyle: const TextStyle(color: Colors.black45, fontSize: 14),
      prefixIcon: icon != null ? Icon(icon, color: AppTheme.primaryBrown, size: 20) : null,
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
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
    );
  }
}
