import 'package:flutter/material.dart';
import '../../theme/app_theme.dart';
import '../../services/license_service.dart';

class ApplyLicenseScreen extends StatefulWidget {
  const ApplyLicenseScreen({super.key});

  @override
  State<ApplyLicenseScreen> createState() => _ApplyLicenseScreenState();
}

class _ApplyLicenseScreenState extends State<ApplyLicenseScreen> {
  final _nameController = TextEditingController();
  final _nicController = TextEditingController();
  final _contactController = TextEditingController();
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _facilityController = TextEditingController();
  final _animalsCountController = TextEditingController();
  final _experienceController = TextEditingController();
  
  bool _isLoading = false;

  void _submitApplication() async {
    if (_nameController.text.isEmpty || _nicController.text.isEmpty || 
        _facilityController.text.isEmpty || _animalsCountController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all required fields")));
      return;
    }

    setState(() => _isLoading = true);
    try {
      await LicenseService().applyLicense({
        "breederName": _nameController.text,
        "nicOrBusinessRegNo": _nicController.text,
        "contactNumber": _contactController.text,
        "email": _emailController.text,
        "address": _addressController.text,
        "facilityDescription": _facilityController.text,
        "animalTypes": ["Dog", "Cat"], 
        "numberOfAnimals": int.tryParse(_animalsCountController.text) ?? 1,
        "yearsOfExperience": int.tryParse(_experienceController.text) ?? 0,
        "saveAsDraft": false,
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("License application submitted successfully!")));
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(
        title: const Text("Apply for License", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.workspace_premium, size: 80, color: Color(0xFFDEC49B)),
            const SizedBox(height: 16),
            const Text("Official Breeder Licensing", textAlign: TextAlign.center, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
            const SizedBox(height: 32),
            _buildField(_nameController, "Breeder / Business Name", Icons.business),
            const SizedBox(height: 16),
            _buildField(_nicController, "NIC / Registration No.", Icons.badge),
            const SizedBox(height: 16),
            _buildField(_contactController, "Contact Number", Icons.phone),
            const SizedBox(height: 16),
            _buildField(_emailController, "Email Address", Icons.email),
            const SizedBox(height: 16),
            _buildField(_addressController, "Full Address", Icons.location_on),
            const SizedBox(height: 16),
            _buildField(_animalsCountController, "Number of Animals Currently", Icons.pets, TextInputType.number),
            const SizedBox(height: 16),
            _buildField(_experienceController, "Years of Experience", Icons.access_time, TextInputType.number),
            const SizedBox(height: 16),
            TextField(
              controller: _facilityController,
              maxLines: 4,
              decoration: _buildInputDecoration("Facility Description\n(Describe your environment, housing, etc.)", Icons.house),
            ),
            const SizedBox(height: 32),
            const Text("Document Submission", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
            const SizedBox(height: 16),
            _buildDocUploadCard("Upload ID Proof", Icons.badge),
            const SizedBox(height: 12),
            _buildDocUploadCard("Facility Images", Icons.photo_library),
            const SizedBox(height: 12),
            _buildDocUploadCard("Supporting Certificates", Icons.card_membership),
            const SizedBox(height: 48),
            ElevatedButton(
              onPressed: _isLoading ? null : _submitApplication,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF5C4033),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
              ),
              child: _isLoading ? const CircularProgressIndicator(color: Colors.white) : const Text("SUBMIT APPLICATION", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
            )
          ]
        ),
      ),
    );
  }

  Widget _buildField(TextEditingController act, String label, IconData icon, [TextInputType type = TextInputType.text]) {
    return TextField(
      controller: act,
      keyboardType: type,
      decoration: _buildInputDecoration(label, icon),
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

  Widget _buildDocUploadCard(String title, IconData icon) {
     return InkWell(
        onTap: () {
           ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("$title upload logic is pending server file storage API setup.")));
        },
        child: Container(
           padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
           decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFDECAAE), width: 1.5),
           ),
           child: Row(
              children: [
                 Icon(icon, color: const Color(0xFF8B5A2B), size: 28),
                 const SizedBox(width: 16),
                 Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5C4033), fontSize: 16))),
                 const Icon(Icons.cloud_upload, color: Color(0xFF9E6D4E))
              ]
           )
        )
     );
  }
}
