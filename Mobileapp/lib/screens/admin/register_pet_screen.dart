import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../services/admin_service.dart';
import '../../utils/admin_ui.dart';

// Admin: register a pet for a verified owner. The server generates the Pet ID and QR code.
class RegisterPetScreen extends StatefulWidget {
  final Map<String, dynamic> owner;
  const RegisterPetScreen({super.key, required this.owner});

  @override
  State<RegisterPetScreen> createState() => _RegisterPetScreenState();
}

class _RegisterPetScreenState extends State<RegisterPetScreen> {
  // Same options as the web registration form
  static const Map<String, List<String>> _breeds = {
    'Dog': ['Golden Retriever', 'Labrador', 'German Shepherd', 'Bulldog', 'Poodle', 'Doberman', 'Husky', 'Beagle', 'Rottweiler', 'Other'],
    'Cat': ['Persian', 'Siamese', 'Maine Coon', 'Bengal', 'British Shorthair', 'Ragdoll', 'Sphynx', 'Other'],
    'Bird': ['Parrot', 'Canary', 'Cockatiel', 'Budgerigar', 'Finch', 'Other'],
    'Rabbit': ['Dutch', 'Flemish Giant', 'Lionhead', 'Rex', 'Other'],
    'Hamster': ['Syrian', 'Dwarf', 'Roborovski', 'Other'],
  };
  static const List<String> _petTypes = ['Dog', 'Cat', 'Bird', 'Rabbit', 'Hamster', 'Other'];

  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _petTypeOther = TextEditingController();
  final _breedText = TextEditingController();
  final _years = TextEditingController(text: '0');
  final _months = TextEditingController(text: '0');
  final _color = TextEditingController();
  final _weight = TextEditingController();
  final _microchip = TextEditingController();
  final _allergies = TextEditingController();
  final _conditions = TextEditingController();
  final _notes = TextEditingController();

  String _petType = 'Dog';
  String? _breed;
  String _gender = 'Male';
  final List<String> _photos = [];
  final List<Uint8List> _photoBytes = [];
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [_name, _petTypeOther, _breedText, _years, _months, _color, _weight, _microchip, _allergies, _conditions, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  bool get _breedIsFreeText => !_breeds.containsKey(_petType) || _breed == 'Other';

  Future<void> _addPhoto(ImageSource source) async {
    if (_photos.length >= 2) return;
    final picked = await ImagePicker().pickImage(source: source, imageQuality: 80, maxWidth: 1200);
    if (picked == null) return;
    final bytes = await picked.readAsBytes();
    if (bytes.length > 2 * 1024 * 1024) {
      if (mounted) showAdminSnack(context, 'Each photo must be 2 MB or smaller.', isError: true);
      return;
    }
    final ext = picked.name.split('.').last.toLowerCase();
    final mime = picked.mimeType ?? (ext == 'png' ? 'image/png' : ext == 'webp' ? 'image/webp' : 'image/jpeg');
    if (!const ['image/jpeg', 'image/png', 'image/webp'].contains(mime)) {
      if (mounted) showAdminSnack(context, 'Photos must be JPEG, PNG or WebP.', isError: true);
      return;
    }
    setState(() {
      _photos.add('data:$mime;base64,${base64Encode(bytes)}');
      _photoBytes.add(bytes);
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final hasBreedList = _breeds.containsKey(_petType);
    if (hasBreedList && _breed == null) {
      showAdminSnack(context, 'Please choose a breed', isError: true);
      return;
    }

    setState(() => _saving = true);
    try {
      final pet = await AdminService().registerPet({
        'ownerId': widget.owner['_id'],
        'petName': _name.text.trim(),
        'petType': _petType,
        if (_petType == 'Other') 'petTypeOther': _petTypeOther.text.trim(),
        // Pets of type "Other" have no breed list: the typed breed is sent directly
        'breed': hasBreedList ? _breed : _breedText.text.trim(),
        if (hasBreedList && _breed == 'Other') 'breedOther': _breedText.text.trim(),
        'age': {'years': int.parse(_years.text.trim()), 'months': int.parse(_months.text.trim())},
        'gender': _gender,
        'color': _color.text.trim(),
        'weight': double.parse(_weight.text.trim()),
        if (_microchip.text.trim().isNotEmpty) 'microchipNumber': _microchip.text.trim(),
        'medicalHistory': {
          'allergies': _allergies.text.trim(),
          'existingConditions': _conditions.text.trim(),
          'specialNotes': _notes.text.trim(),
        },
        'photoUrls': _photos,
      });
      if (!mounted) return;
      await _showRegistered(pet);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _showRegistered(Map<String, dynamic> pet) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        title: const Text('Pet registered'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('${pet['petName']} is registered to ${widget.owner['fullName']}.', textAlign: TextAlign.center),
            const SizedBox(height: 8),
            SelectableText('Pet ID: ${pet['petId'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (pet['qrCode'] is String) sourceImage(pet['qrCode'], size: 180, fit: BoxFit.contain),
            const SizedBox(height: 8),
            const Text('The owner can download the QR code and ID document from their account.', textAlign: TextAlign.center, style: TextStyle(fontSize: 12)),
          ],
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Done'))],
      ),
    );
  }

  String? _required(String? v) => (v == null || v.trim().isEmpty) ? 'Required' : null;

  InputDecoration _dec(String label) => InputDecoration(labelText: label);

  @override
  Widget build(BuildContext context) {
    final breedList = _breeds[_petType];
    return Scaffold(
      backgroundColor: adminCream,
      appBar: AppBar(title: const Text('Register Pet'), backgroundColor: adminCream),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Card(
              child: ListTile(
                leading: const Icon(Icons.person, color: adminLightBrown),
                title: Text(widget.owner['fullName'] ?? ''),
                subtitle: Text('Owner · ${widget.owner['email'] ?? ''}'),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(controller: _name, decoration: _dec('Pet name'), validator: _required),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              // `value` (not initialValue) so the field follows changes in state
              // ignore: deprecated_member_use
              value: _petType,
              decoration: _dec('Pet type'),
              items: _petTypes.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
              onChanged: (v) => setState(() {
                _petType = v ?? 'Dog';
                _breed = null;
              }),
            ),
            if (_petType == 'Other') ...[
              const SizedBox(height: 12),
              TextFormField(controller: _petTypeOther, decoration: _dec('What kind of animal?'), validator: _required),
            ],
            const SizedBox(height: 12),
            if (breedList != null)
              DropdownButtonFormField<String>(
                // ignore: deprecated_member_use
                value: _breed,
                key: ValueKey(_petType),
                decoration: _dec('Breed'),
                items: breedList.map((b) => DropdownMenuItem(value: b, child: Text(b))).toList(),
                onChanged: (v) => setState(() => _breed = v),
              ),
            if (_breedIsFreeText) ...[
              if (breedList != null) const SizedBox(height: 12),
              TextFormField(controller: _breedText, decoration: _dec(breedList == null ? 'Breed' : 'Breed (other)'), validator: _required),
            ],
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: TextFormField(
                  controller: _years,
                  decoration: _dec('Age (years)'),
                  keyboardType: TextInputType.number,
                  validator: (v) => int.tryParse(v?.trim() ?? '') == null || int.parse(v!.trim()) < 0 ? 'Enter years' : null,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _months,
                  decoration: _dec('Age (months)'),
                  keyboardType: TextInputType.number,
                  validator: (v) {
                    final m = int.tryParse(v?.trim() ?? '');
                    return m == null || m < 0 || m > 11 ? '0 to 11' : null;
                  },
                ),
              ),
            ]),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'Male', label: Text('Male'), icon: Icon(Icons.male)),
                ButtonSegment(value: 'Female', label: Text('Female'), icon: Icon(Icons.female)),
              ],
              selected: {_gender},
              onSelectionChanged: (s) => setState(() => _gender = s.first),
            ),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: TextFormField(controller: _color, decoration: _dec('Colour'), validator: _required)),
              const SizedBox(width: 12),
              Expanded(
                child: TextFormField(
                  controller: _weight,
                  decoration: _dec('Weight (kg)'),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  validator: (v) => (double.tryParse(v?.trim() ?? '') ?? -1) < 0 ? 'Enter weight' : null,
                ),
              ),
            ]),
            const SizedBox(height: 12),
            TextFormField(controller: _microchip, decoration: _dec('Microchip number (optional)')),
            const SizedBox(height: 20),
            const Text('Medical history (optional)', style: TextStyle(fontWeight: FontWeight.bold, color: adminBrown)),
            const SizedBox(height: 8),
            TextFormField(controller: _allergies, decoration: _dec('Allergies')),
            const SizedBox(height: 12),
            TextFormField(controller: _conditions, decoration: _dec('Existing conditions')),
            const SizedBox(height: 12),
            TextFormField(controller: _notes, decoration: _dec('Special notes'), maxLines: 2),
            const SizedBox(height: 20),
            const Text('Photos (optional, up to 2)', style: TextStyle(fontWeight: FontWeight.bold, color: adminBrown)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                ..._photoBytes.asMap().entries.map((e) => Stack(children: [
                      ClipRRect(borderRadius: BorderRadius.circular(8), child: Image.memory(e.value, width: 90, height: 90, fit: BoxFit.cover)),
                      Positioned(
                        right: 0,
                        top: 0,
                        child: IconButton(
                          icon: const Icon(Icons.cancel, color: Colors.red),
                          onPressed: () => setState(() {
                            _photos.removeAt(e.key);
                            _photoBytes.removeAt(e.key);
                          }),
                        ),
                      ),
                    ])),
                if (_photos.length < 2) ...[
                  OutlinedButton.icon(onPressed: () => _addPhoto(ImageSource.camera), icon: const Icon(Icons.photo_camera), label: const Text('Camera')),
                  OutlinedButton.icon(onPressed: () => _addPhoto(ImageSource.gallery), icon: const Icon(Icons.photo_library), label: const Text('Gallery')),
                ],
              ],
            ),
            const SizedBox(height: 24),
            ElevatedButton(
              onPressed: _saving ? null : _submit,
              child: _saving
                  ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Register pet & generate QR'),
            ),
          ],
        ),
      ),
    );
  }
}
