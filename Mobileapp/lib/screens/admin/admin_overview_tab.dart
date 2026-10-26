import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../utils/admin_ui.dart';

// Municipal overview: the same figures as the web Authority Dashboard
class AdminOverviewTab extends StatefulWidget {
  final void Function(int tabIndex) onOpenTab;
  const AdminOverviewTab({super.key, required this.onOpenTab});

  @override
  State<AdminOverviewTab> createState() => _AdminOverviewTabState();
}

class _AdminOverviewTabState extends State<AdminOverviewTab> {
  Map<String, dynamic>? _dashboard;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _dashboard == null;
      _error = null;
    });
    try {
      final data = await AdminService().getAuthorityDashboard();
      if (mounted) setState(() => _dashboard = data);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final metrics = Map<String, dynamic>.from(_dashboard?['metrics'] ?? {});
    final urgent = (metrics['openUrgentIncidents'] ?? 0) as num;
    final pendingLicences = (metrics['pendingLicenseRequests'] ?? 0) as num;

    return AdminListState(
      loading: _loading,
      error: _error,
      isEmpty: false,
      emptyText: '',
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Hello, Administrator', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: adminBrown)),
          const Text('Municipal control centre', style: TextStyle(color: adminLightBrown)),
          const SizedBox(height: 16),
          if (urgent > 0)
            _AlertBanner(
              text: '$urgent open urgent or emergency animal incident${urgent == 1 ? '' : 's'}',
              onTap: () => widget.onOpenTab(4),
            ),
          if (pendingLicences > 0)
            _AlertBanner(
              text: '$pendingLicences breeder licence application${pendingLicences == 1 ? '' : 's'} awaiting a decision',
              onTap: () => widget.onOpenTab(3),
              color: Colors.orange.shade800,
            ),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.35,
            children: [
              _MetricCard('Registered pets', '${metrics['totalRegisteredPets'] ?? 0}', Icons.pets, () => widget.onOpenTab(2)),
              _MetricCard('Vaccination compliance', '${metrics['vaccinationComplianceRate'] ?? 0}%', Icons.vaccines, () => widget.onOpenTab(2),
                  helper: '${metrics['compliantPets'] ?? 0} pets up to date'),
              _MetricCard('Breeders', '${metrics['totalBreeders'] ?? 0}', Icons.workspace_premium, () => widget.onOpenTab(3),
                  helper: '$pendingLicences pending'),
              _MetricCard('Incident reports', '${metrics['strayReportsCount'] ?? 0}', Icons.report_problem, () => widget.onOpenTab(4),
                  helper: '$urgent open urgent'),
            ],
          ),
          const SizedBox(height: 16),
          Card(
            child: ListTile(
              leading: const Icon(Icons.people_alt, color: adminLightBrown),
              title: const Text('Manage users'),
              subtitle: const Text('Verify accounts, register pets, send password resets'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => widget.onOpenTab(1),
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  final String text;
  final VoidCallback onTap;
  final Color? color;
  const _AlertBanner({required this.text, required this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? Colors.red.shade700;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: c.withAlpha(30),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: c),
                const SizedBox(width: 10),
                Expanded(child: Text(text, style: TextStyle(color: c, fontWeight: FontWeight.bold))),
                Icon(Icons.chevron_right, color: c),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final VoidCallback onTap;
  final String? helper;
  const _MetricCard(this.label, this.value, this.icon, this.onTap, {this.helper});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: adminLightBrown),
              const SizedBox(height: 6),
              Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: adminBrown)),
              Text(label, style: const TextStyle(fontSize: 13, color: adminBrown), maxLines: 1, overflow: TextOverflow.ellipsis),
              if (helper != null)
                Text(helper!, style: const TextStyle(fontSize: 11, color: adminLightBrown), maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
      ),
    );
  }
}
