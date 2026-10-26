import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../utils/admin_ui.dart';
import 'admin_pet_detail_screen.dart';
import 'register_pet_screen.dart';

// All registered pets, with search; tap a pet to manage its vaccinations
class AdminPetsTab extends StatefulWidget {
  const AdminPetsTab({super.key});

  @override
  State<AdminPetsTab> createState() => _AdminPetsTabState();
}

class _AdminPetsTabState extends State<AdminPetsTab> {
  List<dynamic> _pets = [];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _pets.isEmpty;
      _error = null;
    });
    try {
      final pets = await AdminService().getAllPets();
      if (mounted) setState(() => _pets = pets);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  // Pick a verified owner, then open the registration form
  Future<void> _registerNewPet() async {
    List<dynamic> users;
    try {
      users = (await AdminService().getUsers())
          .where((u) => u['isVerified'] != false && u['isAdmin'] != true)
          .toList();
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
      return;
    }
    if (!mounted) return;

    final owner = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (ctx) => _OwnerPicker(users: users),
    );
    if (owner == null || !mounted) return;

    final registered = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => RegisterPetScreen(owner: owner)),
    );
    if (registered == true) _load();
  }

  String _petType(Map pet) => pet['petType'] == 'Other' ? (pet['petTypeOther'] ?? 'Other') : (pet['petType'] ?? '');
  String _breed(Map pet) => pet['breed'] == 'Other' ? (pet['breedOther'] ?? 'Other') : (pet['breed'] ?? '');

  @override
  Widget build(BuildContext context) {
    final q = _query.toLowerCase();
    final visible = _pets.where((p) {
      if (q.isEmpty) return true;
      return '${p['petName']} ${p['petId']} ${p['owner']?['fullName']} ${p['breed']}'.toLowerCase().contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _registerNewPet,
        backgroundColor: adminBrown,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Register pet'),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search pet, Pet ID, owner or breed'),
              onChanged: (value) => setState(() => _query = value),
            ),
          ),
          Expanded(
            child: AdminListState(
              loading: _loading,
              error: _error,
              isEmpty: visible.isEmpty,
              emptyText: _query.isEmpty ? 'No pets registered yet.' : 'No pets match your search.',
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 88),
                itemCount: visible.length,
                itemBuilder: (context, index) {
                  final pet = Map<String, dynamic>.from(visible[index]);
                  final photos = List<String>.from(pet['photoUrls'] ?? (pet['photoUrl'] != null ? [pet['photoUrl']] : []));
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(10),
                      leading: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: photos.isNotEmpty
                            ? sourceImage(photos.first, size: 56)
                            : Container(width: 56, height: 56, color: adminCream, child: const Icon(Icons.pets, color: adminLightBrown)),
                      ),
                      title: Text(pet['petName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: adminBrown)),
                      subtitle: Text('${_petType(pet)} · ${_breed(pet)}\nOwner: ${pet['owner']?['fullName'] ?? '-'}'),
                      isThreeLine: true,
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => AdminPetDetailScreen(pet: pet)),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OwnerPicker extends StatefulWidget {
  final List<dynamic> users;
  const _OwnerPicker({required this.users});

  @override
  State<_OwnerPicker> createState() => _OwnerPickerState();
}

class _OwnerPickerState extends State<_OwnerPicker> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final q = _query.toLowerCase();
    final visible = widget.users.where((u) => '${u['fullName']} ${u['email']} ${u['nicNumber']}'.toLowerCase().contains(q)).toList();
    return SizedBox(
      height: MediaQuery.of(context).size.height * 0.75,
      child: Column(
        children: [
          const Text('Choose the owner', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: adminBrown)),
          const Text('Only verified accounts can own pets', style: TextStyle(fontSize: 12)),
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search name, email or NIC'),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: visible.isEmpty
                ? const Center(child: Text('No verified users found.'))
                : ListView.builder(
                    itemCount: visible.length,
                    itemBuilder: (context, i) {
                      final u = Map<String, dynamic>.from(visible[i]);
                      return ListTile(
                        leading: const Icon(Icons.person, color: adminLightBrown),
                        title: Text(u['fullName'] ?? ''),
                        subtitle: Text(u['email'] ?? ''),
                        onTap: () => Navigator.pop(context, u),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
