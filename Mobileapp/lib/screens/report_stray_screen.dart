import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../theme/app_theme.dart';
import '../services/stray_service.dart';

// Report any animal incident: violence or abuse, a sick or injured animal in a public
// place, a stray animal, or something else. Matches the web "Report an Animal Incident" form.
class ReportStrayScreen extends StatefulWidget {
  const ReportStrayScreen({super.key});

  @override
  State<ReportStrayScreen> createState() => _ReportStrayScreenState();
}

class _IncidentType {
  final String value;
  final String label;
  final String defaultUrgency;
  const _IncidentType(this.value, this.label, this.defaultUrgency);
}

class _ReportStrayScreenState extends State<ReportStrayScreen> {
  // Must match Backend/models/StrayReport.js
  static const List<_IncidentType> _incidentTypes = [
    _IncidentType('violence', 'Violence or abuse', 'urgent'),
    _IncidentType('sick_injured', 'Sick or injured in public', 'urgent'),
    _IncidentType('stray', 'Stray animal', 'normal'),
    _IncidentType('other', 'Other incident', 'normal'),
  ];
  static const Map<String, String> _urgencyLabels = {
    'emergency': 'Emergency - life in danger now',
    'urgent': 'Urgent - needs attention today',
    'normal': 'Normal - can wait a few days',
  };
  static const int _maxPhotos = 2;
  static const int _maxPhotoBytes = 2 * 1024 * 1024;

  final _otherTypeController = TextEditingController();
  final _locationController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _nameController = TextEditingController();
  final _contactController = TextEditingController();

  // No type is pre-selected, so nobody files an urgent violence report by accident
  String? _incidentType;
  String _urgency = 'normal';
  Position? _position;
  bool _locating = false;
  final List<String> _photos = []; // data URLs sent to the API
  final List<Uint8List> _photoBytes = []; // decoded once for the previews
  bool _isLoading = false;

  @override
  void dispose() {
    _otherTypeController.dispose();
    _locationController.dispose();
    _descriptionController.dispose();
    _nameController.dispose();
    _contactController.dispose();
    super.dispose();
  }

  void _showSnack(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: isError ? Colors.red : null),
    );
  }

  Future<void> _useMyLocation() async {
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _showSnack('Location services are turned off. Please describe the location instead.', isError: true);
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _showSnack('Location permission was not granted. Please describe the location instead.', isError: true);
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 15),
        ),
      );
      if (mounted) setState(() => _position = position);
    } catch (e) {
      _showSnack('Could not get your location. Please describe the location instead.', isError: true);
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _addPhoto(ImageSource source) async {
    if (_photos.length >= _maxPhotos) {
      _showSnack('You can attach a maximum of two photos.', isError: true);
      return;
    }
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 80, maxWidth: 1200);
    if (picked == null) return;

    final bytes = await picked.readAsBytes();
    if (bytes.length > _maxPhotoBytes) {
      _showSnack('Each photo must be 2 MB or smaller.', isError: true);
      return;
    }
    final ext = picked.name.split('.').last.toLowerCase();
    final mimeType = picked.mimeType ??
        (ext == 'png' ? 'image/png' : ext == 'webp' ? 'image/webp' : ext == 'jpg' || ext == 'jpeg' ? 'image/jpeg' : '');
    if (!const ['image/jpeg', 'image/png', 'image/webp'].contains(mimeType)) {
      _showSnack('Photos must be JPEG, PNG or WebP.', isError: true);
      return;
    }
    setState(() {
      _photos.add('data:$mimeType;base64,${base64Encode(bytes)}');
      _photoBytes.add(bytes);
    });
  }

  Future<void> _submitReport() async {
    if (_incidentType == null) {
      _showSnack('Please choose what happened', isError: true);
      return;
    }
    if (_locationController.text.trim().isEmpty || _descriptionController.text.trim().isEmpty) {
      _showSnack('Location and description are required', isError: true);
      return;
    }
    if (_incidentType == 'other' && _otherTypeController.text.trim().isEmpty) {
      _showSnack('Please describe the type of incident', isError: true);
      return;
    }

    setState(() => _isLoading = true);
    try {
      await StrayService().reportStray({
        'incidentType': _incidentType,
        if (_incidentType == 'other') 'otherIncidentType': _otherTypeController.text.trim(),
        'urgency': _urgency,
        'location': _locationController.text.trim(),
        if (_position != null)
          'coordinates': {'lat': _position!.latitude, 'lng': _position!.longitude},
        'description': _descriptionController.text.trim(),
        'images': _photos,
        if (_nameController.text.trim().isNotEmpty) 'reporterName': _nameController.text.trim(),
        if (_contactController.text.trim().isNotEmpty) 'reporterContact': _contactController.text.trim(),
      });
      if (mounted) {
        _showSnack('Report sent to the municipal authority.');
        Navigator.pop(context);
      }
    } catch (e) {
      _showSnack(e.toString().replaceAll('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(
        title: const Text("Report an Incident", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Icon(Icons.report_problem_outlined, size: 64, color: Color(0xFF8B5A2B)),
            const SizedBox(height: 12),
            const Text(
              "Report an animal that is being harmed, is sick or injured in a public place, is a stray, or needs help.",
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF9E6D4E), fontSize: 15),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFFFFF4E5), borderRadius: BorderRadius.circular(10)),
              child: const Text(
                "If someone is in danger or an animal is being attacked right now, also call the police or your local emergency number.",
                style: TextStyle(color: Color(0xFF7A4A00), fontSize: 13),
              ),
            ),
            const SizedBox(height: 24),
            const Text("What happened?", style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBrown)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _incidentTypes.map((type) => ChoiceChip(
                label: Text(type.label),
                selected: _incidentType == type.value,
                onSelected: (_) => setState(() {
                  _incidentType = type.value;
                  _urgency = type.defaultUrgency;
                }),
              )).toList(),
            ),
            if (_incidentType == 'other') ...[
              const SizedBox(height: 16),
              TextField(
                controller: _otherTypeController,
                maxLength: 100,
                decoration: _buildInputDecoration("Type of incident", Icons.edit_note),
              ),
            ],
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              // alue (not initialValue) so the field follows the default urgency of the chosen type
              // ignore: deprecated_member_use
              value: _urgency,
              isExpanded: true,
              decoration: _buildInputDecoration("How urgent is it?", Icons.priority_high),
              items: _urgencyLabels.entries
                  .map((entry) => DropdownMenuItem(value: entry.key, child: Text(entry.value, overflow: TextOverflow.ellipsis)))
                  .toList(),
              onChanged: (value) => setState(() => _urgency = value ?? 'normal'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _locationController,
              maxLength: 300,
              decoration: _buildInputDecoration("Location (street, landmark, town)", Icons.map),
            ),
            Row(
              children: [
                TextButton.icon(
                  onPressed: _locating ? null : _useMyLocation,
                  icon: _locating
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.my_location),
                  label: Text(_position == null ? "Use my current location" : "Update my location"),
                ),
                if (_position != null)
                  Expanded(
                    child: Text(
                      "Attached: ${_position!.latitude.toStringAsFixed(5)}, ${_position!.longitude.toStringAsFixed(5)}",
                      style: const TextStyle(fontSize: 12, color: Color(0xFF5C4033)),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _descriptionController,
              maxLines: 4,
              maxLength: 2000,
              decoration: _buildInputDecoration("What did you see? Describe the animal and its condition", Icons.description),
            ),
            const SizedBox(height: 8),
            Text("Photos (optional, up to $_maxPhotos)", style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBrown)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ..._photoBytes.asMap().entries.map((entry) => Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.memory(entry.value, width: 96, height: 96, fit: BoxFit.cover),
                    ),
                    Positioned(
                      right: 0,
                      top: 0,
                      child: IconButton(
                        icon: const Icon(Icons.cancel, color: Colors.red),
                        tooltip: 'Remove photo',
                        onPressed: () => setState(() {
                          _photos.removeAt(entry.key);
                          _photoBytes.removeAt(entry.key);
                        }),
                      ),
                    ),
                  ],
                )),
                if (_photos.length < _maxPhotos) ...[
                  OutlinedButton.icon(
                    onPressed: () => _addPhoto(ImageSource.camera),
                    icon: const Icon(Icons.photo_camera),
                    label: const Text("Camera"),
                  ),
                  OutlinedButton.icon(
                    onPressed: () => _addPhoto(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library),
                    label: const Text("Gallery"),
                  ),
                ],
              ],
            ),
            const SizedBox(height: 24),
            const Text("Your contact details (optional)", style: TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primaryBrown)),
            const SizedBox(height: 4),
            const Text(
              "Only the municipal authority can see these. Leave blank to report anonymously.",
              style: TextStyle(fontSize: 12, color: Color(0xFF9E6D4E)),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _nameController,
              maxLength: 100,
              decoration: _buildInputDecoration("Name", Icons.person),
            ),
            TextField(
              controller: _contactController,
              maxLength: 150,
              keyboardType: TextInputType.emailAddress,
              decoration: _buildInputDecoration("Phone or email", Icons.phone),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submitReport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5C4033),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isLoading
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text("SUBMIT REPORT", style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1.2)),
              ),
            ),
          ],
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
