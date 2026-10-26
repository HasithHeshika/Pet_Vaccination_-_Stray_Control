import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../utils/admin_ui.dart';

Color licenceStatusColor(String? status) {
  switch (status) {
    case 'Approved':
      return Colors.green;
    case 'Pending':
      return Colors.orange.shade800;
    case 'Rejected':
      return Colors.red;
    case 'Expired':
      return Colors.grey;
    default:
      return adminLightBrown;
  }
}

// Breeder licence applications: review details and documents, approve or reject
class AdminLicencesTab extends StatefulWidget {
  const AdminLicencesTab({super.key});

  @override
  State<AdminLicencesTab> createState() => _AdminLicencesTabState();
}

class _AdminLicencesTabState extends State<AdminLicencesTab> {
  List<dynamic> _licences = [];
  bool _loading = true;
  String? _error;
  String _filter = 'Pending';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _licences.isEmpty;
      _error = null;
    });
    try {
      final list = await AdminService().getLicenses();
      if (mounted) setState(() => _licences = list);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _filter == 'All' ? _licences : _licences.where((l) => l['status'] == _filter).toList();
    return Column(
      children: [
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(
            children: ['Pending', 'Approved', 'Rejected', 'Expired', 'All']
                .map((f) => Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(f == 'All' ? 'All' : '$f (${_licences.where((l) => l['status'] == f).length})'),
                        selected: _filter == f,
                        onSelected: (_) => setState(() => _filter = f),
                      ),
                    ))
                .toList(),
          ),
        ),
        Expanded(
          child: AdminListState(
            loading: _loading,
            error: _error,
            isEmpty: visible.isEmpty,
            emptyText: _filter == 'Pending' ? 'No applications are waiting for a decision.' : 'No applications in this list.',
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              itemCount: visible.length,
              itemBuilder: (context, index) {
                final lic = Map<String, dynamic>.from(visible[index]);
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    title: Text(lic['breederName'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, color: adminBrown)),
                    subtitle: Text(
                      '${lic['applicationId'] ?? ''} · ${lic['applicationType'] ?? 'New'}\n'
                      '${(lic['animalTypes'] as List?)?.join(', ') ?? ''} · ${lic['numberOfAnimals'] ?? 0} animals · applied ${shortDate(lic['createdAt'])}',
                    ),
                    isThreeLine: true,
                    trailing: StatusChip(lic['status'] ?? '', licenceStatusColor(lic['status'])),
                    onTap: () async {
                      final changed = await Navigator.push<bool>(
                        context,
                        MaterialPageRoute(builder: (_) => AdminLicenceDetailScreen(licenceId: lic['_id'])),
                      );
                      if (changed == true) _load();
                    },
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

class AdminLicenceDetailScreen extends StatefulWidget {
  final String licenceId;
  const AdminLicenceDetailScreen({super.key, required this.licenceId});

  @override
  State<AdminLicenceDetailScreen> createState() => _AdminLicenceDetailScreenState();
}

class _AdminLicenceDetailScreenState extends State<AdminLicenceDetailScreen> {
  Map<String, dynamic>? _licence;
  String? _error;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await AdminService().getLicense(widget.licenceId);
      if (mounted) setState(() => _licence = data);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    }
  }

  Future<void> _decide(String status) async {
    final remarksController = TextEditingController(
      text: status == 'Approved' ? 'Reviewed and approved by authority' : '',
    );
    final remarks = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(status == 'Approved' ? 'Approve licence?' : 'Reject application?'),
        content: TextField(
          controller: remarksController,
          maxLines: 3,
          decoration: InputDecoration(labelText: status == 'Approved' ? 'Remarks (optional)' : 'Reason for rejection'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          TextButton(
            onPressed: () {
              if (status == 'Rejected' && remarksController.text.trim().isEmpty) return;
              Navigator.pop(ctx, remarksController.text.trim());
            },
            child: Text(status == 'Approved' ? 'Approve' : 'Reject'),
          ),
        ],
      ),
    );
    if (remarks == null) return;

    setState(() => _saving = true);
    try {
      await AdminService().updateLicenseStatus(widget.licenceId, status, remarks);
      if (!mounted) return;
      showAdminSnack(context, status == 'Approved' ? 'Licence approved (valid for one year)' : 'Application rejected');
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  List<Map<String, dynamic>> _documents(Map<String, dynamic> lic) {
    final docs = Map<String, dynamic>.from(lic['documents'] ?? {});
    return [
      if (docs['idProof'] is Map) Map<String, dynamic>.from(docs['idProof']),
      ...((docs['facilityImages'] as List?) ?? []).map((d) => Map<String, dynamic>.from(d)),
      ...((docs['certificates'] as List?) ?? []).map((d) => Map<String, dynamic>.from(d)),
    ];
  }

  Widget _row(String label, dynamic value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(width: 130, child: Text(label, style: const TextStyle(color: adminLightBrown))),
          Expanded(child: Text('${value ?? '-'}', style: const TextStyle(color: adminBrown))),
        ]),
      );

  @override
  Widget build(BuildContext context) {
    final lic = _licence;
    return Scaffold(
      backgroundColor: adminCream,
      appBar: AppBar(title: const Text('Licence Application'), backgroundColor: adminCream),
      body: lic == null
          ? Center(child: _error != null ? Text(_error!) : const CircularProgressIndicator(color: adminBrown))
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Row(children: [
                        Expanded(
                          child: Text(lic['breederName'] ?? '',
                              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: adminBrown)),
                        ),
                        StatusChip(lic['status'] ?? '', licenceStatusColor(lic['status'])),
                      ]),
                      const Divider(),
                      _row('Application', '${lic['applicationId'] ?? ''} (${lic['applicationType'] ?? 'New'})'),
                      if (lic['licenseId'] != null) _row('Licence ID', lic['licenseId']),
                      _row('Applicant', lic['applicantId'] is Map ? lic['applicantId']['fullName'] : null),
                      _row('NIC / Reg. no', lic['nicOrBusinessRegNo']),
                      _row('Contact', '${lic['contactNumber'] ?? ''} · ${lic['email'] ?? ''}'),
                      _row('Address', lic['address']),
                      _row('Animals', '${(lic['animalTypes'] as List?)?.join(', ') ?? ''}${(lic['otherAnimalType'] ?? '').toString().isNotEmpty ? ' (${lic['otherAnimalType']})' : ''} · ${lic['numberOfAnimals'] ?? 0}'),
                      _row('Experience', '${lic['yearsOfExperience'] ?? 0} years'),
                      _row('Facility', lic['facilityDescription']),
                      _row('Submitted', shortDate(lic['submittedAt'] ?? lic['createdAt'])),
                      if (lic['expiryDate'] != null) _row('Expires', shortDate(lic['expiryDate'])),
                      if ((lic['remarks'] ?? '').toString().isNotEmpty) _row('Remarks', lic['remarks']),
                    ]),
                  ),
                ),
                const SizedBox(height: 8),
                const Text('Uploaded documents', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: adminBrown)),
                const SizedBox(height: 8),
                if (_documents(lic).isEmpty) const Text('No documents uploaded.'),
                ..._documents(lic).map((doc) {
                  final url = (doc['previewUrl'] ?? '').toString();
                  final isImage = url.startsWith('data:image');
                  return Card(
                    margin: const EdgeInsets.only(bottom: 10),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('${doc['label'] ?? 'Document'}: ${doc['fileName'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        if (isImage)
                          ClipRRect(borderRadius: BorderRadius.circular(8), child: sourceImage(url, size: 220, fit: BoxFit.contain))
                        else
                          Text(url.startsWith('data:application/pdf')
                              ? 'PDF document: open it from the web admin page to view.'
                              : 'No preview available.'),
                      ]),
                    ),
                  );
                }),
                const SizedBox(height: 16),
                if (lic['status'] == 'Pending')
                  Row(children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _saving ? null : () => _decide('Rejected'),
                        icon: const Icon(Icons.close, color: Colors.red),
                        label: const Text('Reject', style: TextStyle(color: Colors.red)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: FilledButton.icon(
                        onPressed: _saving ? null : () => _decide('Approved'),
                        icon: const Icon(Icons.check),
                        label: const Text('Approve'),
                        style: FilledButton.styleFrom(backgroundColor: Colors.green.shade700),
                      ),
                    ),
                  ]),
              ],
            ),
    );
  }
}
