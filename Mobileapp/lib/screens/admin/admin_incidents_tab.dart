import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../services/admin_service.dart';
import '../../utils/admin_ui.dart';

const Map<String, String> _typeLabels = {
  'violence': 'Violence or abuse',
  'sick_injured': 'Sick or injured in public',
  'stray': 'Stray animal',
  'other': 'Other incident',
};

Color _urgencyColor(String? urgency) {
  switch (urgency) {
    case 'emergency':
      return Colors.red.shade700;
    case 'urgent':
      return Colors.orange.shade800;
    default:
      return Colors.blueGrey;
  }
}

// Animal incident reports: open and most urgent first (sorted by the API)
class AdminIncidentsTab extends StatefulWidget {
  const AdminIncidentsTab({super.key});

  @override
  State<AdminIncidentsTab> createState() => _AdminIncidentsTabState();
}

class _AdminIncidentsTabState extends State<AdminIncidentsTab> {
  List<dynamic> _reports = [];
  bool _loading = true;
  String? _error;
  bool _openOnly = true;
  String _busyId = '';
  final Map<String, List<String>> _photos = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _reports.isEmpty;
      _error = null;
    });
    try {
      final list = await AdminService().getIncidents();
      if (mounted) setState(() => _reports = list);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _setStatus(Map report, String status) async {
    setState(() => _busyId = report['_id']);
    try {
      await AdminService().updateIncidentStatus(report['_id'], status);
      await _load();
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _busyId = '');
    }
  }

  Future<void> _loadPhotos(Map report) async {
    setState(() => _busyId = report['_id']);
    try {
      final detail = await AdminService().getIncident(report['_id']);
      final images = <String>[
        ...List<String>.from(detail['images'] ?? []),
        if (detail['image'] is String && (detail['image'] as String).isNotEmpty) detail['image'],
      ].where((s) => s.startsWith('data:image/') || s.startsWith('https://') || s.startsWith('http://')).toList();
      if (mounted) setState(() => _photos[report['_id']] = images);
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _busyId = '');
    }
  }

  @override
  Widget build(BuildContext context) {
    final visible = _openOnly ? _reports.where((r) => r['status'] != 'resolved').toList() : _reports;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
          child: Row(children: [
            ChoiceChip(label: const Text('Open'), selected: _openOnly, onSelected: (_) => setState(() => _openOnly = true)),
            const SizedBox(width: 8),
            ChoiceChip(label: const Text('All'), selected: !_openOnly, onSelected: (_) => setState(() => _openOnly = false)),
          ]),
        ),
        Expanded(
          child: AdminListState(
            loading: _loading,
            error: _error,
            isEmpty: visible.isEmpty,
            emptyText: _openOnly ? 'No open incident reports.' : 'No incident reports yet.',
            onRefresh: _load,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              itemCount: visible.length,
              itemBuilder: (context, index) {
                final r = Map<String, dynamic>.from(visible[index]);
                final type = r['incidentType'] == 'other' && r['otherIncidentType'] != null
                    ? 'Other: ${r['otherIncidentType']}'
                    : (_typeLabels[r['incidentType'] ?? 'stray'] ?? 'Animal incident');
                final urgency = (r['urgency'] ?? 'normal').toString();
                final coords = r['coordinates'] is Map ? Map<String, dynamic>.from(r['coordinates']) : null;
                final mapLink = coords != null && coords['lat'] != null ? 'https://www.google.com/maps?q=${coords['lat']},${coords['lng']}' : null;
                final reporter = [r['reporterName'], r['reporterContact']].where((v) => v != null && '$v'.isNotEmpty).join(' · ');
                final photos = _photos[r['_id']];
                final imageCount = (r['imageCount'] ?? 0) as num;
                final busy = _busyId == r['_id'];

                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(color: _urgencyColor(urgency), width: urgency == 'normal' ? 0.5 : 2),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(children: [
                          StatusChip(urgency.toUpperCase(), _urgencyColor(urgency)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(type, style: const TextStyle(fontWeight: FontWeight.bold, color: adminBrown))),
                          Text(shortDate(r['reportedAt'] ?? r['createdAt']), style: const TextStyle(fontSize: 12)),
                        ]),
                        const SizedBox(height: 8),
                        Row(children: [
                          const Icon(Icons.place, size: 18, color: adminLightBrown),
                          const SizedBox(width: 4),
                          Expanded(child: Text(r['location'] ?? '', style: const TextStyle(fontWeight: FontWeight.w600))),
                        ]),
                        if (mapLink != null)
                          TextButton.icon(
                            style: TextButton.styleFrom(padding: EdgeInsets.zero, visualDensity: VisualDensity.compact),
                            onPressed: () async {
                              await Clipboard.setData(ClipboardData(text: mapLink));
                              if (context.mounted) showAdminSnack(context, 'Map link copied: paste it into Maps or a browser');
                            },
                            icon: const Icon(Icons.map, size: 18),
                            label: Text('GPS ${coords!['lat']}, ${coords['lng']} (copy map link)'),
                          ),
                        const SizedBox(height: 4),
                        Text(r['description'] ?? ''),
                        const SizedBox(height: 6),
                        Text('Reported by: ${reporter.isNotEmpty ? reporter : (r['reportedBy']?['fullName'] ?? 'Anonymous')}',
                            style: const TextStyle(fontSize: 12, color: adminLightBrown)),
                        if (imageCount > 0 && photos == null)
                          TextButton.icon(
                            onPressed: busy ? null : () => _loadPhotos(r),
                            icon: const Icon(Icons.photo_library, size: 18),
                            label: Text('View $imageCount photo${imageCount == 1 ? '' : 's'}'),
                          ),
                        if (photos != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 8),
                            child: photos.isEmpty
                                ? const Text('No viewable photos.')
                                : Wrap(
                                    spacing: 8,
                                    children: photos
                                        .map((p) => ClipRRect(borderRadius: BorderRadius.circular(8), child: sourceImage(p, size: 140)))
                                        .toList(),
                                  ),
                          ),
                        const SizedBox(height: 8),
                        Row(children: [
                          const Text('Status: ', style: TextStyle(color: adminLightBrown)),
                          DropdownButton<String>(
                            value: (r['status'] ?? 'pending').toString(),
                            onChanged: busy ? null : (v) => v == null || v == r['status'] ? null : _setStatus(r, v),
                            items: const [
                              DropdownMenuItem(value: 'pending', child: Text('Pending')),
                              DropdownMenuItem(value: 'in-progress', child: Text('In progress')),
                              DropdownMenuItem(value: 'resolved', child: Text('Resolved')),
                            ],
                          ),
                          if (busy) const Padding(padding: EdgeInsets.only(left: 8), child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))),
                        ]),
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
