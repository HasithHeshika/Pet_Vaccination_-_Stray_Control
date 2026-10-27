import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import '../services/lost_and_found_service.dart';
import '../utils/admin_ui.dart' show sourceImage, shortDate;
import 'report_lost_screen.dart';
import 'report_stray_screen.dart';

// Lost & Found feed with Lost / Found / Mine tabs and the matches the authority has confirmed for me
class LostFoundScreen extends StatefulWidget {
  const LostFoundScreen({super.key});

  @override
  State<LostFoundScreen> createState() => _LostFoundScreenState();
}

class _LostFoundScreenState extends State<LostFoundScreen> {
  static const _tabs = ['All', 'Lost', 'Found', 'Mine', 'Matches'];

  List<dynamic> _reports = [];
  List<dynamic>? _matches;
  bool _loading = true;
  String? _error;
  String _tab = 'All';
  String? _userId;

  @override
  void initState() {
    super.initState();
    AuthService().getUserId().then((id) {
      if (mounted) setState(() => _userId = id);
    });
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _reports.isEmpty;
      _error = null;
    });
    try {
      final reports = await LostAndFoundService().getLostAndFoundList();
      if (mounted) setState(() => _reports = reports);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadMatches() async {
    try {
      final matches = await LostAndFoundService().getMyMatches();
      if (mounted) setState(() => _matches = matches);
    } catch (e) {
      if (mounted) setState(() => _matches = []);
    }
  }

  String _typeOf(Map report) => report['reportType'] ?? (report['status'] == 'Found' ? 'found' : 'lost');

  bool _isMine(Map report) {
    final by = report['reportedBy'];
    final id = by is Map ? by['_id'] : by;
    return _userId != null && id == _userId;
  }

  Future<void> _openReportForm(String type) async {
    final created = await Navigator.push(context, MaterialPageRoute(builder: (_) => ReportLostScreen(initialType: type)));
    if (created == true && mounted) _load();
  }

  Future<void> _markResolved(Map report) async {
    try {
      await LostAndFoundService().updateStatus(report['_id'], 'Resolved');
      _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')), backgroundColor: Colors.red));
      }
    }
  }

  void _showContact(Map report) {
    final contact = (report['contactInfo'] ?? '').toString();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(_typeOf(report) == 'found' ? 'Contact the finder' : 'Contact the owner'),
        content: SelectableText(contact.isEmpty ? 'No contact details given.' : contact, style: const TextStyle(fontSize: 18)),
        actions: [
          if (contact.isNotEmpty)
            TextButton(
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: contact));
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Contact details copied')));
              },
              child: const Text('Copy'),
            ),
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final visible = _reports.where((r) {
      switch (_tab) {
        case 'Lost':
          return _typeOf(r) == 'lost';
        case 'Found':
          return _typeOf(r) == 'found';
        case 'Mine':
          return _isMine(r);
        default:
          return true;
      }
    }).toList();

    return Scaffold(
      appBar: AppBar(title: const Text('Lost & Found')),
      body: Column(
        children: [
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Row(
              children: _tabs
                  .map((t) => Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: ChoiceChip(
                          label: Text(t == 'Matches' ? 'My matches' : t),
                          selected: _tab == t,
                          onSelected: (_) {
                            setState(() => _tab = t);
                            if (t == 'Matches') _loadMatches();
                          },
                        ),
                      ))
                  .toList(),
            ),
          ),
          Expanded(child: _tab == 'Matches' ? _buildMatches() : _buildReports(visible)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF5C4033),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Create Report', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        onPressed: () {
          showModalBottomSheet(
            context: context,
            backgroundColor: const Color(0xFFF9EED9),
            shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
            builder: (ctx) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 32.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Create Report', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                  const SizedBox(height: 24),
                  ListTile(
                    leading: const CircleAvatar(backgroundColor: Color(0xFF8B3A3A), child: Icon(Icons.search, color: Colors.white)),
                    title: const Text('I lost a pet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                    subtitle: const Text('Report your missing pet'),
                    onTap: () {
                      Navigator.pop(ctx);
                      _openReportForm('lost');
                    },
                  ),
                  ListTile(
                    leading: const CircleAvatar(backgroundColor: Color(0xFF5C4033), child: Icon(Icons.pets, color: Colors.white)),
                    title: const Text('I found a pet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                    subtitle: const Text('Help a lost pet get home'),
                    onTap: () {
                      Navigator.pop(ctx);
                      _openReportForm('found');
                    },
                  ),
                  ListTile(
                    leading: const CircleAvatar(backgroundColor: Color(0xFF9E6D4E), child: Icon(Icons.report_problem_outlined, color: Colors.white)),
                    title: const Text('Report an Animal Incident', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                    subtitle: const Text('Violence, sick or injured animals, strays and more'),
                    onTap: () {
                      Navigator.pop(ctx);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportStrayScreen()));
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildReports(List<dynamic> visible) {
    if (_loading) return const Center(child: CircularProgressIndicator(color: AppTheme.primaryBrown));
    return RefreshIndicator(
      onRefresh: _load,
      child: _error != null || visible.isEmpty
          ? ListView(children: [
              const SizedBox(height: 120),
              Center(
                child: Text(
                  _error ?? (_tab == 'Mine' ? "You haven't submitted any reports yet." : 'No reports here right now.'),
                  style: const TextStyle(color: AppTheme.primaryBrown),
                ),
              ),
            ])
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
              itemCount: visible.length,
              itemBuilder: (context, index) => _buildCard(Map<String, dynamic>.from(visible[index])),
            ),
    );
  }

  Widget _buildCard(Map<String, dynamic> report) {
    final isFound = _typeOf(report) == 'found';
    final photos = <String>[...List<String>.from(report['images'] ?? []), if (report['imageUrl'] is String) report['imageUrl']];
    final species = report['species'] == 'Other' ? report['speciesOther'] : report['species'];
    final status = (report['status'] ?? '').toString();
    final name = (report['petName'] ?? '').toString();

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Stack(children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              child: photos.isNotEmpty
                  ? SizedBox(height: 180, width: double.infinity, child: FittedBox(fit: BoxFit.cover, clipBehavior: Clip.hardEdge, child: sourceImage(photos.first, size: 400)))
                  : Image.asset('assets/images/login_dog.png', height: 180, width: double.infinity, fit: BoxFit.cover),
            ),
            Positioned(
              top: 16,
              right: 16,
              child: _badge(isFound ? 'FOUND' : 'LOST', isFound ? AppTheme.secondaryGold : AppTheme.activeOrange),
            ),
            if (status == 'In Progress' || status == 'Resolved')
              Positioned(top: 16, left: 16, child: _badge(status.toUpperCase(), Colors.black54)),
          ]),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name.isEmpty || name == 'Unknown' ? (isFound ? 'Unknown name' : 'Unnamed pet') : name,
                    style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppTheme.primaryText)),
                const SizedBox(height: 6),
                Text([species, report['breed'], report['color']].where((v) => v != null && '$v'.isNotEmpty && v != 'Unknown').join(' · '),
                    style: const TextStyle(fontSize: 15, color: AppTheme.primaryBrown)),
                const SizedBox(height: 6),
                Text('${isFound ? 'Found at' : 'Last seen'}: ${report['lastSeenLocation'] ?? ''} · ${shortDate(report['lastSeenDate'])}',
                    style: const TextStyle(fontSize: 14)),
                if ((report['description'] ?? '').toString().isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(report['description'], style: const TextStyle(fontSize: 14, fontStyle: FontStyle.italic)),
                ],
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => _showContact(report),
                  style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 45)),
                  child: Text(isFound ? 'Contact Finder' : 'Contact Owner'),
                ),
                if (_isMine(report) && status != 'Resolved')
                  TextButton.icon(
                    onPressed: () => _markResolved(report),
                    icon: const Icon(Icons.check_circle_outline),
                    label: const Text('Mark resolved (reunited)'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMatches() {
    final matches = _matches;
    if (matches == null) return const Center(child: CircularProgressIndicator(color: AppTheme.primaryBrown));
    if (matches.isEmpty) {
      return RefreshIndicator(
        onRefresh: _loadMatches,
        child: ListView(children: const [
          SizedBox(height: 100),
          Padding(
            padding: EdgeInsets.all(24),
            child: Text(
              'No confirmed matches yet. When the authority confirms that a found pet may be yours, or that the pet you found may have an owner, it will appear here and you will get an email.',
              textAlign: TextAlign.center,
              style: TextStyle(color: AppTheme.primaryBrown),
            ),
          ),
        ]),
      );
    }
    return RefreshIndicator(
      onRefresh: _loadMatches,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 96),
        itemCount: matches.length,
        itemBuilder: (context, index) {
          final m = Map<String, dynamic>.from(matches[index]);
          final other = Map<String, dynamic>.from(m['other'] ?? {});
          final isOwner = m['role'] == 'owner';
          final photos = List<String>.from(other['images'] ?? []);
          final contact = other['contactInfo'];
          return Card(
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    _badge('POSSIBLE MATCH', Colors.green.shade700),
                    const Spacer(),
                    Text(shortDate(m['reviewedAt']), style: const TextStyle(fontSize: 12)),
                  ]),
                  const SizedBox(height: 10),
                  Text(
                    isOwner ? 'A pet that was found may be yours' : 'The pet you found may have an owner',
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryText),
                  ),
                  if (photos.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(spacing: 8, children: photos.map((p) => ClipRRect(borderRadius: BorderRadius.circular(8), child: sourceImage(p, size: 130))).toList()),
                  ],
                  const SizedBox(height: 10),
                  Text([other['species'], other['breed'], other['color']].where((v) => v != null && '$v'.isNotEmpty && v != 'Unknown').join(' · ')),
                  if (other['location'] != null) Text('${isOwner ? 'Found at' : 'Last seen'}: ${other['location']} · ${shortDate(other['date'])}'),
                  if (m['reviewNote'] != null) ...[
                    const SizedBox(height: 6),
                    Text('Note from the authority: ${m['reviewNote']}', style: const TextStyle(fontStyle: FontStyle.italic)),
                  ],
                  const SizedBox(height: 10),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFF9EED9), borderRadius: BorderRadius.circular(10)),
                    child: contact != null
                        ? SelectableText('${isOwner ? 'Finder' : 'Owner'}: $contact', style: const TextStyle(fontWeight: FontWeight.bold))
                        : const Text('The owner has been given your contact details and will get in touch.'),
                  ),
                  const SizedBox(height: 8),
                  const Text('Please make sure it is the same animal before arranging a hand-over.',
                      style: TextStyle(fontSize: 12, color: Colors.brown)),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _badge(String text, Color color) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(12)),
        child: Text(text, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
      );
}
