import 'package:flutter/material.dart';
import '../../services/pet_service.dart';
import '../../services/vaccination_service.dart';
import '../../theme/app_theme.dart';

class RecordVaccineScreen extends StatefulWidget {
  const RecordVaccineScreen({super.key});

  @override
  State<RecordVaccineScreen> createState() => _RecordVaccineScreenState();
}

class _RecordVaccineScreenState extends State<RecordVaccineScreen> {
  final _petIdController = TextEditingController();
  final _vaccineNameController = TextEditingController();
  final _batchController = TextEditingController();
  final _nextDueDateController = TextEditingController();
  
  bool _isLoading = false;
  Map<String, dynamic>? _foundPet;

  void _searchPet() async {
    if (_petIdController.text.trim().isEmpty) return;
    
    setState(() { _isLoading = true; _foundPet = null; });
    try {
      final data = await PetService().getPetByPetIdString(_petIdController.text.trim());
      setState(() => _foundPet = data);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Pet not found ($e)")));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _submitVaccine() async {
    if (_foundPet == null) return;
    if (_vaccineNameController.text.isEmpty || _batchController.text.isEmpty || _nextDueDateController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Fill all required vaccine fields.")));
      return;
    }
    
    setState(() => _isLoading = true);
    try {
      await VaccinationService().addVaccination({
        "pet": _foundPet!['_id'],
        "vaccineName": _vaccineNameController.text,
        "batchNumber": _batchController.text,
        "administeredDate": DateTime.now().toIso8601String(),
        "nextDueDate": _nextDueDateController.text, 
        "notes": "Administered via Vet Mobile Portal"
      });
      if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Vaccination securely recorded.")));
         Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e")));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(title: const Text("Record Vaccine", style: TextStyle(color: Color(0xFF5C4033))), backgroundColor: Colors.transparent, elevation: 0, iconTheme: const IconThemeData(color: Color(0xFF5C4033))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(child: TextField(controller: _petIdController, decoration: _inputDec("Enter Pet ID (e.g. PET-1234)", Icons.tag))),
                const SizedBox(width: 8),
                Container(
                   decoration: BoxDecoration(color: const Color(0xFF8B5A2B), borderRadius: BorderRadius.circular(12)),
                   child: IconButton(icon: const Icon(Icons.search, color: Colors.white, size: 28), onPressed: _searchPet)
                )
              ],
            ),
            if (_isLoading) const Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: Color(0xFF5C4033))),
            if (_foundPet != null) ...[
               const SizedBox(height: 24),
               Container(
                 padding: const EdgeInsets.all(16),
                 decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFFDEC49B))),
                 child: Row(
                   children: [
                     const Icon(Icons.pets, color: Color(0xFF8B5A2B), size: 40),
                     const SizedBox(width: 16),
                     Expanded(child: Column(
                       crossAxisAlignment: CrossAxisAlignment.start,
                       children: [
                         Text(_foundPet!['name'] ?? 'Unknown', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                         Text("${_foundPet!['species']} - ${_foundPet!['breed']}", style: const TextStyle(color: Color(0xFF9E6D4E)))
                       ]
                     ))
                   ]
                 )
               ),
               const SizedBox(height: 32),
               TextField(controller: _vaccineNameController, decoration: _inputDec("Vaccine Name (e.g. Rabies)", Icons.vaccines)),
               const SizedBox(height: 16),
               TextField(controller: _batchController, decoration: _inputDec("Batch Number", Icons.confirmation_number)),
               const SizedBox(height: 16),
               TextField(controller: _nextDueDateController, decoration: _inputDec("Next Due Date (YYYY-MM-DD)", Icons.calendar_today)),
               const SizedBox(height: 48),
               ElevatedButton(
                 onPressed: _submitVaccine,
                 style: ElevatedButton.styleFrom(
                   minimumSize: const Size(double.infinity, 50),
                   backgroundColor: const Color(0xFF8B5A2B),
                   shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                 ),
                 child: const Text("RECORD VACCINATION", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: 1.2)),
               )
            ]
          ]
        )
      )
    );
  }

  InputDecoration _inputDec(String label, IconData icon) {
     return InputDecoration(
        labelText: label, filled: true, fillColor: Colors.white,
        prefixIcon: Icon(icon, color: AppTheme.primaryBrown),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))
     );
  }
}
