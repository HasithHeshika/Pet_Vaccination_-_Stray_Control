import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/lost_and_found_service.dart';
import '../services/pet_service.dart';

// Report a lost or a found pet. Species, photos, GPS and dates feed the matching system,
// which suggests possible matches for the authority to review.
class ReportLostScreen extends StatefulWidget {
  final String initialType; // 'lost' or 'found'
  const ReportLostScreen({super.key, this.initialType = 'lost'});

  @override
  State<ReportLostScreen> createState() => _ReportLostScreenState();
}

class _ReportLostScreenState extends State<ReportLostScreen> {
  // Must match Backend/models/LostReport.js
  static const List<String> _speciesList = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Other'];
  static const int _maxPhotos = 2;
  static const int _maxPhotoBytes = 2 * 1024 * 1024;

  final _petNameController = TextEditingController();
  final _speciesOtherController = TextEditingController();
  final _breedController = TextEditingController();
  final _colorController = TextEditingController();
  final _locationController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _contactController = TextEditingController();
  final _tagController = TextEditingController();

  late String _type = widget.initialType == 'found' ? 'found' : 'lost';
  String? _species;
  DateTime? _date;
  Position? _position;
  bool _locating = false;
  final List<String> _photos = [];
  final List<Uint8List> _photoBytes = [];
  List<dynamic> _myPets = [];
  String? _linkedPetId;
  bool _isLoading = false;

  bool get _isFound => _type == 'found';

  @override
  void initState() {
    super.initState();
    _loadMyPets();
  }

  @override
  void dispose() {
    for (final c in [_petNameController, _speciesOtherController, _breedController, _colorController,
      _locationController, _descriptionController, _contactController, _tagController]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _loadMyPets() async {
    try {
      final userId = await AuthService().getUserId();
      if (userId == null) return;
      final pets = await PetService().getUserPets(userId);
      if (mounted) setState(() => _myPets = pets);
    } catch (_) {
      // Picking a registered pet is optional
    }
  }

  void _showSnack(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: isError ? Colors.red : null));
  }

  void _pickPet(String? petId) {
    setState(() => _linkedPetId = petId);
    final pet = _myPets.cast<Map>().where((p) => p['_id'] == petId).firstOrNull;
    if (pet == null) return;
    setState(() {
      _petNameController.text = pet['petName'] ?? '';
      _species = _speciesList.contains(pet['petType']) ? pet['petType'] : null;
      if (pet['petType'] == 'Other') _speciesOtherController.text = pet['petTypeOther'] ?? '';
      _breedController.text = pet['breed'] == 'Other' ? (pet['breedOther'] ?? '') : (pet['breed'] ?? '');
      _colorController.text = pet['color'] ?? '';
    });
  }

  Future<void> _useMyLocation() async {
    setState(() => _locating = true);
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        _showSnack('Location services are turned off. Please describe the location instead.', isError: true);
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        _showSnack('Location permission was not granted. Please describe the location instead.', isError: true);
        return;
      }
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.high, timeLimit: Duration(seconds: 15)),
      );
      if (mounted) setState(() => _position = position);
    } catch (_) {
      _showSnack('Could not get your location. Please describe the location instead.', isError: true);
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _addPhoto(ImageSource source) async {
    if (_photos.length >= _maxPhotos) return;
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 75, maxWidth: 1024);
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

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _date = picked);
  }

  Future<void> _submitReport() async {
    final missingName = !_isFound && _petNameController.text.trim().isEmpty;
    final missingBreed = !_isFound && _breedController.text.trim().isEmpty;
    if (_species == null || missingName || missingBreed || _colorController.text.trim().isEmpty ||
        _locationController.text.trim().isEmpty || _date == null || _contactController.text.trim().isEmpty) {
      _showSnack('Please fill all required fields', isError: true);
      return;
    }
    if (_species == 'Other' && _speciesOtherController.text.trim().isEmpty) {
      _showSnack('Please say what kind of animal it is', isError: true);
      return;
    }

    setState(() => _isLoading = true);
    try {
      await LostAndFoundService().reportLost({
        'reportType': _type,
        'species': _species,
        if (_species == 'Other') 'speciesOther': _speciesOtherController.text.trim(),
        'petName': _petNameController.text.trim(),
        'breed': _breedController.text.trim(),
        'color': _colorController.text.trim(),
        'lastSeenLocation': _locationController.text.trim(),
        'lastSeenDate': _date!.toIso8601String(),
        if (_position != null) 'coordinates': {'lat': _position!.latitude, 'lng': _position!.longitude},
        'description': _descriptionController.text.trim(),
        'contactInfo': _contactController.text.trim(),
        'images': _photos,
        if (_isFound && _tagController.text.trim().isNotEmpty) 'tagPetId': _tagController.text.trim(),
        if (!_isFound && _linkedPetId != null) 'linkedPet': _linkedPetId,
      });
      if (mounted) {
        _showSnack(_isFound
            ? 'Thank you! The authority will check it against missing and registered pets.'
            : 'Report submitted. You will be told if the authority finds a match.');
        Navigator.pop(context, true);
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
        title: Text(_isFound ? 'Report a Found Pet' : 'Report a Missing Pet',
            style: const TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold, fontSize: 20)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildToggleButton('lost', 'I LOST A PET'),
                const SizedBox(width: 12),
                _buildToggleButton('found', 'I FOUND A PET'),
              ],
            ),
            const SizedBox(height: 24),
            if (!_isFound && _myPets.isNotEmpty) ...[
              _buildLabel('Which of your registered pets is missing? (optional)'),
              DropdownButtonFormField<String?>(
                // ignore: deprecated_member_use
                value: _linkedPetId,
                isExpanded: true,
                decoration: _buildInputDecoration('Choose a pet', Icons.pets),
                items: [
                  const DropdownMenuItem<String?>(value: null, child: Text('Not a registered pet')),
                  ..._myPets.map((p) => DropdownMenuItem<String?>(
                        value: p['_id'] as String,
                        child: Text('${p['petName']} (${p['petType']}, ${p['petId']})', overflow: TextOverflow.ellipsis),
                      )),
                ],
                onChanged: _pickPet,
              ),
              const SizedBox(height: 16),
            ],
            _buildLabel('Species *'),
            DropdownButtonFormField<String>(
              // ignore: deprecated_member_use
              value: _species,
              decoration: _buildInputDecoration('Choose species', Icons.category),
              items: _speciesList.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
              onChanged: (v) => setState(() => _species = v),
            ),
            if (_species == 'Other') ...[
              const SizedBox(height: 12),
              TextField(controller: _speciesOtherController, decoration: _buildInputDecoration('What kind of animal?', null)),
            ],
            const SizedBox(height: 16),
            _buildLabel(_isFound ? 'Name on collar (if any)' : 'Pet name *'),
            TextField(
              controller: _petNameController,
              decoration: _buildInputDecoration(_isFound ? 'Leave blank if unknown' : 'Enter pet name', Icons.pets),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _buildLabel(_isFound ? 'Breed (if known)' : 'Breed *'),
                    TextField(controller: _breedController, decoration: _buildInputDecoration('e.g. Labrador', null)),
                  ]),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    _buildLabel('Colour / markings *'),
                    TextField(controller: _colorController, decoration: _buildInputDecoration('e.g. black, white chest', null)),
                  ]),
                ),
              ],
            ),
            if (_isFound) ...[
              const SizedBox(height: 16),
              _buildLabel('Pet ID on the QR tag (if any)'),
              TextField(controller: _tagController, decoration: _buildInputDecoration('e.g. PETMH3K2ABC123', Icons.qr_code)),
            ],
            const SizedBox(height: 16),
            _buildLabel(_isFound ? 'Where did you find it? *' : 'Last seen location *'),
            TextField(
              controller: _locationController,
              decoration: _buildInputDecoration('Street, landmark, town', Icons.location_on),
            ),
            Row(children: [
              TextButton.icon(
                onPressed: _locating ? null : _useMyLocation,
                icon: _locating
                    ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.my_location),
                label: Text(_position == null ? 'Use my current location' : 'Update my location'),
              ),
              if (_position != null)
                Expanded(
                  child: Text(
                    'Attached: ${_position!.latitude.toStringAsFixed(5)}, ${_position!.longitude.toStringAsFixed(5)}',
                    style: const TextStyle(fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ]),
            const SizedBox(height: 8),
            _buildLabel(_isFound ? 'Date found *' : 'Last seen date *'),
            GestureDetector(
              onTap: _pickDate,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFDECAAE), width: 1.5),
                ),
                child: Row(children: [
                  const Icon(Icons.calendar_month, color: AppTheme.primaryBrown),
                  const SizedBox(width: 12),
                  Text(
                    _date != null ? '${_date!.day}/${_date!.month}/${_date!.year}' : 'dd/mm/yyyy',
                    style: TextStyle(fontSize: 16, color: _date != null ? Colors.black87 : Colors.black54),
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 16),
            _buildLabel('Additional description'),
            TextField(
              controller: _descriptionController,
              maxLines: 4,
              decoration: _buildInputDecoration('Collar, tags, injuries, behaviour, distinctive marks...', null),
            ),
            const SizedBox(height: 16),
            _buildLabel('Photos (up to $_maxPhotos)'),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ..._photoBytes.asMap().entries.map((entry) => Stack(children: [
                      ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(entry.value, width: 96, height: 96, fit: BoxFit.cover)),
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
                    ])),
                if (_photos.length < _maxPhotos) ...[
                  OutlinedButton.icon(onPressed: () => _addPhoto(ImageSource.camera), icon: const Icon(Icons.photo_camera), label: const Text('Camera')),
                  OutlinedButton.icon(onPressed: () => _addPhoto(ImageSource.gallery), icon: const Icon(Icons.photo_library), label: const Text('Gallery')),
                ],
              ],
            ),
            const SizedBox(height: 16),
            _buildLabel('Contact information *'),
            TextField(
              controller: _contactController,
              decoration: _buildInputDecoration('Phone number or email', Icons.contact_phone),
            ),
            const Padding(
              padding: EdgeInsets.only(top: 6, left: 4),
              child: Text('Shown on the Lost & Found feed and shared with the other person when a match is confirmed.',
                  style: TextStyle(fontSize: 12, color: Colors.black54)),
            ),
            const SizedBox(height: 32),
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
                    child: const Text('Cancel', style: TextStyle(color: AppTheme.primaryBrown, fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _submitReport,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5C4033),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: _isLoading
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Submit Report', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 4),
      child: Text(text, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF333333))),
    );
  }

  Widget _buildToggleButton(String type, String label) {
    final isSelected = _type == type;
    return GestureDetector(
      onTap: () => setState(() => _type = type),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        decoration: BoxDecoration(
          color: isSelected ? (type == 'lost' ? const Color(0xFF8B3A3A) : const Color(0xFF5C4033)) : Colors.transparent,
          border: Border.all(color: const Color(0xFF5C4033), width: 2),
          borderRadius: BorderRadius.circular(24),
        ),
        child: Text(label, style: TextStyle(color: isSelected ? Colors.white : const Color(0xFF5C4033), fontWeight: FontWeight.bold)),
      ),
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
