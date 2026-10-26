import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../utils/admin_ui.dart';

// Admin view of one pet: details, QR code and vaccination records (add / delete)
class AdminPetDetailScreen extends StatefulWidget {
  final Map<String, dynamic> pet;
  const AdminPetDetailScreen({super.key, required this.pet});

  @override
  State<AdminPetDetailScreen> createState() => _AdminPetDetailScreenState();
}

class _AdminPetDetailScreenState extends State<AdminPetDetailScreen> {
  List<dynamic> _vaccinations = [];
  bool _loading = true;
  String? _error;

  Map<String, dynamic> get pet => widget.pet;

  @override
  void initState() {
    super.initState();
    _loadVaccinations();
  }

  Future<void> _loadVaccinations() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await AdminService().getPetVaccinations(pet['_id']);
      if (mounted) setState(() => _vaccinations = list);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _delete(Map vaccination) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete vaccination record?'),
        content: Text('${vaccination['vaccineName']} given on ${shortDate(vaccination['dateAdministered'])} will be removed.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await AdminService().deleteVaccination(vaccination['_id']);
      if (mounted) showAdminSnack(context, 'Vaccination record deleted');
      _loadVaccinations();
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    }
  }

  Future<void> _add() async {
    final added = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _AddVaccinationSheet(petMongoId: pet['_id']),
    );
    if (added == true) {
      if (mounted) showAdminSnack(context, 'Vaccination record added');
      _loadVaccinations();
    }
  }

  Widget _row(String label, dynamic value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 120, child: Text(label, style: const TextStyle(color: adminLightBrown))),
          Expanded(child: Text('${value ?? '-'}', style: const TextStyle(color: adminBrown))),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final age = Map<String, dynamic>.from(pet['age'] ?? {});
    final medical = Map<String, dynamic>.from(pet['medicalHistory'] ?? {});
    final owner = Map<String, dynamic>.from(pet['owner'] ?? {});
    final photos = List<String>.from(pet['photoUrls'] ?? (pet['photoUrl'] != null ? [pet['photoUrl']] : []));

    return Scaffold(
      backgroundColor: adminCream,
      appBar: AppBar(title: Text(pet['petName'] ?? 'Pet'), backgroundColor: adminCream),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _add,
        backgroundColor: adminBrown,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.vaccines),
        label: const Text('Add vaccination'),
      ),
      body: RefreshIndicator(
        onRefresh: _loadVaccinations,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 96),
          children: [
            if (photos.isNotEmpty)
              SizedBox(
                height: 140,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: photos
                      .map((p) => Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ClipRRect(borderRadius: BorderRadius.circular(12), child: sourceImage(p, size: 140)),
                          ))
                      .toList(),
                ),
              ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SelectableText('Pet ID: ${pet['petId'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.bold, color: adminBrown)),
                  const Divider(),
                  _row('Type', pet['petType'] == 'Other' ? pet['petTypeOther'] : pet['petType']),
                  _row('Breed', pet['breed'] == 'Other' ? pet['breedOther'] : pet['breed']),
                  _row('Age', '${age['years'] ?? 0} yrs ${age['months'] ?? 0} mo'),
                  _row('Gender', pet['gender']),
                  _row('Colour', pet['color']),
                  _row('Weight', pet['weight'] != null ? '${pet['weight']} kg' : null),
                  if (pet['microchipNumber'] != null) _row('Microchip', pet['microchipNumber']),
                  _row('Registered', shortDate(pet['registrationDate'])),
                  const Divider(),
                  _row('Owner', owner['fullName']),
                  _row('Email', owner['email']),
                  _row('Phone', owner['phone']),
                  if ((medical['allergies'] ?? '').toString().isNotEmpty ||
                      (medical['existingConditions'] ?? '').toString().isNotEmpty ||
                      (medical['specialNotes'] ?? '').toString().isNotEmpty) ...[
                    const Divider(),
                    _row('Allergies', medical['allergies']),
                    _row('Conditions', medical['existingConditions']),
                    _row('Notes', medical['specialNotes']),
                  ],
                ]),
              ),
            ),
            if (pet['qrCode'] is String)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Column(children: [
                    const Text('QR code', style: TextStyle(fontWeight: FontWeight.bold, color: adminBrown)),
                    sourceImage(pet['qrCode'], size: 160, fit: BoxFit.contain),
                  ]),
                ),
              ),
            const SizedBox(height: 8),
            Text('Vaccination history (${_vaccinations.length})',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: adminBrown)),
            const SizedBox(height: 8),
            if (_loading)
              const Padding(padding: EdgeInsets.all(24), child: Center(child: CircularProgressIndicator(color: adminBrown)))
            else if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red))
            else if (_vaccinations.isEmpty)
              const Text('No vaccination records yet.')
            else
              ..._vaccinations.map((v) {
                final due = DateTime.tryParse('${v['nextDueDate']}');
                final overdue = due != null && due.isBefore(DateTime.now());
                return Card(
                  margin: const EdgeInsets.only(bottom: 10),
                  child: ListTile(
                    title: Text(v['vaccineName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(
                      '${v['vaccineType'] ?? ''}\n'
                      'Given ${shortDate(v['dateAdministered'])} · next due ${shortDate(v['nextDueDate'])}\n'
                      '${v['veterinarianName'] ?? ''}${v['clinicName'] != null ? ' (${v['clinicName']})' : ''}',
                    ),
                    isThreeLine: true,
                    leading: Icon(overdue ? Icons.warning_amber_rounded : Icons.check_circle,
                        color: overdue ? Colors.red : Colors.green),
                    trailing: IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      tooltip: 'Delete record',
                      onPressed: () => _delete(v),
                    ),
                  ),
                );
              }),
          ],
        ),
      ),
    );
  }
}

class _AddVaccinationSheet extends StatefulWidget {
  final String petMongoId;
  const _AddVaccinationSheet({required this.petMongoId});

  @override
  State<_AddVaccinationSheet> createState() => _AddVaccinationSheetState();
}

class _AddVaccinationSheetState extends State<_AddVaccinationSheet> {
  // Must match the vaccineType enum in Backend/models/Vaccination.js
  static const List<String> _types = [
    'Rabies',
    'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)',
    'Bordetella (Kennel Cough)',
    'Leptospirosis',
    'Lyme Disease',
    'Canine Influenza',
    'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)',
    'FeLV (Feline Leukemia)',
    'FIV (Feline Immunodeficiency Virus)',
    'Other',
  ];

  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _vet = TextEditingController();
  final _clinic = TextEditingController();
  final _batch = TextEditingController();
  final _notes = TextEditingController();
  String _type = 'Rabies';
  DateTime _given = DateTime.now();
  DateTime _due = DateTime.now().add(const Duration(days: 365));
  bool _saving = false;

  @override
  void dispose() {
    for (final c in [_name, _vet, _clinic, _batch, _notes]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate(bool isGiven) async {
    final initial = isGiven ? _given : _due;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2000),
      lastDate: DateTime.now().add(const Duration(days: 365 * 5)),
    );
    if (picked != null) setState(() => isGiven ? _given = picked : _due = picked);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_due.isAfter(_given)) {
      showAdminSnack(context, 'The next due date must be after the date given', isError: true);
      return;
    }
    setState(() => _saving = true);
    try {
      await AdminService().addVaccination({
        'petId': widget.petMongoId,
        'vaccineType': _type,
        'vaccineName': _name.text.trim(),
        'dateAdministered': _given.toIso8601String(),
        'nextDueDate': _due.toIso8601String(),
        if (_vet.text.trim().isNotEmpty) 'veterinarianName': _vet.text.trim(),
        if (_clinic.text.trim().isNotEmpty) 'clinicName': _clinic.text.trim(),
        if (_batch.text.trim().isNotEmpty) 'batchNumber': _batch.text.trim(),
        if (_notes.text.trim().isNotEmpty) 'notes': _notes.text.trim(),
        'status': 'administered',
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(left: 20, right: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Add vaccination', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: adminBrown)),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                // ignore: deprecated_member_use
                value: _type,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Vaccine type'),
                items: _types.map((t) => DropdownMenuItem(value: t, child: Text(t, overflow: TextOverflow.ellipsis))).toList(),
                onChanged: (v) => setState(() => _type = v ?? 'Rabies'),
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _name,
                decoration: const InputDecoration(labelText: 'Vaccine name (e.g. Nobivac Rabies)'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
              ),
              const SizedBox(height: 12),
              Row(children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickDate(true),
                    icon: const Icon(Icons.event),
                    label: Text('Given ${shortDate(_given.toIso8601String())}'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickDate(false),
                    icon: const Icon(Icons.event_repeat),
                    label: Text('Due ${shortDate(_due.toIso8601String())}'),
                  ),
                ),
              ]),
              const SizedBox(height: 12),
              TextFormField(controller: _vet, decoration: const InputDecoration(labelText: 'Veterinarian (optional; defaults to you)')),
              const SizedBox(height: 12),
              TextFormField(controller: _clinic, decoration: const InputDecoration(labelText: 'Clinic (optional)')),
              const SizedBox(height: 12),
              TextFormField(controller: _batch, decoration: const InputDecoration(labelText: 'Batch number (optional)')),
              const SizedBox(height: 12),
              TextFormField(controller: _notes, decoration: const InputDecoration(labelText: 'Notes (optional)'), maxLines: 2),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _saving ? null : _save,
                child: _saving
                    ? const SizedBox(height: 22, width: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Save vaccination'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
