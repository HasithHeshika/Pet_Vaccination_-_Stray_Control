import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../utils/admin_ui.dart';
import 'register_pet_screen.dart';

// Registered users: verify new accounts, register pets for owners, send password reset links
class AdminUsersTab extends StatefulWidget {
  const AdminUsersTab({super.key});

  @override
  State<AdminUsersTab> createState() => _AdminUsersTabState();
}

class _AdminUsersTabState extends State<AdminUsersTab> {
  List<dynamic> _users = [];
  bool _loading = true;
  String? _error;
  String _query = '';
  String _busyId = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _users.isEmpty;
      _error = null;
    });
    try {
      final users = await AdminService().getUsers();
      // Accounts awaiting verification first
      users.sort((a, b) => ((a['isVerified'] == false) ? 0 : 1).compareTo((b['isVerified'] == false) ? 0 : 1));
      if (mounted) setState(() => _users = users);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _verify(Map user) async {
    setState(() => _busyId = user['_id']);
    try {
      final message = await AdminService().verifyUser(user['_id']);
      if (mounted) showAdminSnack(context, message);
      await _load();
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _busyId = '');
    }
  }

  Future<void> _sendReset(Map user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send password reset link?'),
        content: Text('${user['email']} will receive an email with a link to set a new password.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Send')),
        ],
      ),
    );
    if (confirmed != true) return;
    setState(() => _busyId = user['_id']);
    try {
      final message = await AdminService().sendPasswordReset(user['_id']);
      if (mounted) showAdminSnack(context, message);
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _busyId = '');
    }
  }

  void _showDetails(Map user) {
    final address = Map<String, dynamic>.from(user['address'] ?? {});
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(user['fullName'] ?? '', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: adminBrown)),
            const SizedBox(height: 8),
            _detail(Icons.email, user['email']),
            _detail(Icons.phone, user['phone']),
            _detail(Icons.badge, 'NIC ${user['nicNumber'] ?? '-'}'),
            _detail(Icons.home, [address['street'], address['city'], address['province'], address['postalCode']]
                .where((p) => p != null && p.toString().isNotEmpty)
                .join(', ')),
            _detail(Icons.person, 'Role: ${user['isAdmin'] == true ? 'admin' : (user['role'] ?? 'user')}'),
          ],
        ),
      ),
    );
  }

  Widget _detail(IconData icon, dynamic text) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Icon(icon, size: 18, color: adminLightBrown),
          const SizedBox(width: 10),
          Expanded(child: Text('${text ?? '-'}')),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final q = _query.toLowerCase();
    final visible = _users.where((u) {
      if (q.isEmpty) return true;
      return '${u['fullName']} ${u['email']} ${u['nicNumber']}'.toLowerCase().contains(q);
    }).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: TextField(
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Search name, email or NIC'),
            onChanged: (value) => setState(() => _query = value),
          ),
        ),
        Expanded(
          child: AdminListState(
            loading: _loading,
            error: _error,
            isEmpty: visible.isEmpty,
            emptyText: _query.isEmpty ? 'No users registered yet.' : 'No users match your search.',
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              itemCount: visible.length,
              itemBuilder: (context, index) {
                final user = visible[index] as Map;
                final isVerified = user['isVerified'] != false;
                final isAdminUser = user['isAdmin'] == true;
                final busy = _busyId == user['_id'];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        InkWell(
                          onTap: () => _showDetails(user),
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: adminCream,
                                child: Text(((user['fullName'] ?? '?') as String).isNotEmpty ? (user['fullName'] as String)[0].toUpperCase() : '?',
                                    style: const TextStyle(color: adminBrown, fontWeight: FontWeight.bold)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(user['fullName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: adminBrown)),
                                    Text(user['email'] ?? '', style: const TextStyle(fontSize: 13), overflow: TextOverflow.ellipsis),
                                  ],
                                ),
                              ),
                              if (isAdminUser)
                                const StatusChip('Admin', adminBrown)
                              else if (user['role'] == 'veterinarian')
                                const StatusChip('Vet', Colors.teal)
                              else
                                StatusChip(isVerified ? 'Verified' : 'Pending', isVerified ? Colors.green : Colors.orange.shade800),
                            ],
                          ),
                        ),
                        if (!isAdminUser) ...[
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 4,
                            children: [
                              if (!isVerified)
                                FilledButton.icon(
                                  onPressed: busy ? null : () => _verify(user),
                                  icon: const Icon(Icons.verified_user, size: 18),
                                  label: const Text('Verify'),
                                ),
                              OutlinedButton.icon(
                                onPressed: (!isVerified || busy)
                                    ? null
                                    : () => Navigator.push(
                                          context,
                                          MaterialPageRoute(builder: (_) => RegisterPetScreen(owner: Map<String, dynamic>.from(user))),
                                        ),
                                icon: const Icon(Icons.pets, size: 18),
                                label: const Text('Register pet'),
                              ),
                              OutlinedButton.icon(
                                onPressed: busy ? null : () => _sendReset(user),
                                icon: const Icon(Icons.lock_reset, size: 18),
                                label: const Text('Reset password'),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
