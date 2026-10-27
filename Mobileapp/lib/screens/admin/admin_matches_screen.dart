import 'package:flutter/material.dart';
import '../../services/admin_service.dart';
import '../../utils/admin_ui.dart';

// Possible Lost & Found matches for the authority to confirm or reject (same data as the web /admin/matches page)
class AdminMatchesScreen extends StatefulWidget {
  const AdminMatchesScreen({super.key});

  @override
  State<AdminMatchesScreen> createState() => _AdminMatchesScreenState();
}

class _AdminMatchesScreenState extends State<AdminMatchesScreen> {
  static const _statuses = ['suggested', 'confirmed', 'rejected'];

  String _status = 'suggested';
  List<dynamic> _matches = [];
  Map<String, dynamic> _counts = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _matches.isEmpty;
      _error = null;
    });
    try {
      final data = await AdminService().getMatches(_status);
      if (mounted) {
        setState(() {
          _matches = List<dynamic>.from(data['matches'] ?? []);
          _counts = Map<String, dynamic>.from(data['counts'] ?? {});
        });
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(Map<String, dynamic> match) async {
    final changed = await Navigator.push(context, MaterialPageRoute(builder: (_) => AdminMatchDetailScreen(matchId: match['_id'])));
    if (changed == true && mounted) _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Lost & Found Matches')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Wrap(
                spacing: 8,
                runSpacing: 4,
                children: _statuses
                    .map((s) => ChoiceChip(
                          label: Text('${s[0].toUpperCase()}${s.substring(1)} (${_counts[s] ?? 0})'),
                          selected: _status == s,
                          onSelected: (_) {
                            setState(() {
                              _status = s;
                              _matches = [];
                            });
                            _load();
                          },
                        ))
                    .toList(),
              ),
            ),
          ),
          Expanded(
            child: AdminListState(
              loading: _loading,
              error: _error,
              isEmpty: _matches.isEmpty,
              emptyText: _status == 'suggested' ? 'No possible matches to review right now.' : 'No $_status matches.',
              onRefresh: _load,
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: _matches.length,
                itemBuilder: (context, index) {
                  final m = Map<String, dynamic>.from(_matches[index]);
                  final found = Map<String, dynamic>.from(m['found'] ?? {});
                  final other = Map<String, dynamic>.from(m['lost'] ?? m['pet'] ?? {});
                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(24),
                      onTap: () => _open(m),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            _thumb(found),
                            const Padding(padding: EdgeInsets.symmetric(horizontal: 6), child: Icon(Icons.compare_arrows, color: adminLightBrown)),
                            _thumb(other),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  _ScoreChip(m['score']),
                                  const SizedBox(height: 4),
                                  Text(
                                    m['candidateType'] == 'registered_pet' ? 'Found vs registered pet ${other['petId'] ?? ''}' : 'Found vs lost "${other['petName'] ?? ''}"',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: adminBrown),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  Text(_describe(found), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12)),
                                  Text('Found ${shortDate(found['date'])}', style: const TextStyle(fontSize: 12, color: adminLightBrown)),
                                ],
                              ),
                            ),
                          ],
                        ),
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

  Widget _thumb(Map<String, dynamic> side) {
    final images = List<String>.from(side['images'] ?? []);
    return ClipRRect(
      borderRadius: BorderRadius.circular(10),
      child: images.isNotEmpty
          ? sourceImage(images.first, size: 56)
          : Container(width: 56, height: 56, color: adminCream, child: const Icon(Icons.pets, color: adminLightBrown)),
    );
  }
}

String _describe(Map<String, dynamic> side) =>
    [side['species'], side['breed'], side['color']].where((v) => v != null && '$v'.isNotEmpty && v != 'Unknown').join(' · ');

class _ScoreChip extends StatelessWidget {
  final dynamic score;
  const _ScoreChip(this.score);

  @override
  Widget build(BuildContext context) {
    final s = (score ?? 0) as num;
    final color = s >= 75 ? Colors.green.shade700 : (s >= 55 ? Colors.orange.shade800 : Colors.grey.shade700);
    return StatusChip('Score $s / 100', color);
  }
}

// One match: both sides with photos, the score breakdown, AI panel and confirm / reject
class AdminMatchDetailScreen extends StatefulWidget {
  final String matchId;
  const AdminMatchDetailScreen({super.key, required this.matchId});

  @override
  State<AdminMatchDetailScreen> createState() => _AdminMatchDetailScreenState();
}

class _AdminMatchDetailScreenState extends State<AdminMatchDetailScreen> {
  Map<String, dynamic>? _match;
  bool _loading = true;
  bool _busy = false;
  bool _changed = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = _match == null;
      _error = null;
    });
    try {
      final match = await AdminService().getMatch(widget.matchId);
      if (mounted) setState(() => _match = match);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _decide(String decision) async {
    final controller = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(decision == 'confirm' ? 'Confirm this match?' : 'Reject this match?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(decision == 'confirm'
                ? 'The owner and the finder will be emailed and both reports set to In Progress.'
                : 'This pair will not be suggested again.'),
            const SizedBox(height: 12),
            TextField(
              controller: controller,
              maxLength: 500,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: decision == 'confirm' ? 'Note for the owner and finder (optional)' : 'Reason (optional)',
                border: const OutlineInputBorder(),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: decision == 'confirm' ? Colors.green.shade700 : Colors.red.shade700),
            child: Text(decision == 'confirm' ? 'Confirm' : 'Reject', style: const TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    final note = controller.text.trim();
    controller.dispose();
    if (confirmed != true || !mounted) return;

    setState(() => _busy = true);
    try {
      final message = await AdminService().reviewMatch(widget.matchId, decision, note);
      if (!mounted) return;
      showAdminSnack(context, message);
      _changed = true;
      await _load();
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _rerun() async {
    final foundId = _match?['found']?['_id'];
    if (foundId == null) return;
    setState(() => _busy = true);
    try {
      final message = await AdminService().rerunMatching(foundId);
      if (!mounted) return;
      showAdminSnack(context, message);
      _changed = true;
    } catch (e) {
      if (mounted) showAdminSnack(context, errorText(e), isError: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final m = _match ?? {};
    final isPet = m['candidateType'] == 'registered_pet';
    final status = (m['status'] ?? '').toString();

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) Navigator.pop(context, _changed);
      },
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Review Match'),
          actions: [
            if (_match != null)
              IconButton(tooltip: 'Re-run matching for the found report', onPressed: _busy ? null : _rerun, icon: const Icon(Icons.refresh)),
          ],
        ),
        body: AdminListState(
          loading: _loading,
          error: _error,
          isEmpty: false,
          emptyText: '',
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Row(children: [
                _ScoreChip(m['score']),
                const SizedBox(width: 8),
                StatusChip(status.toUpperCase(),
                    status == 'confirmed' ? Colors.green.shade700 : (status == 'rejected' ? Colors.red.shade700 : Colors.blueGrey)),
              ]),
              const SizedBox(height: 12),
              _Side(title: 'Found report', side: Map<String, dynamic>.from(m['found'] ?? {})),
              _Side(
                title: isPet ? 'Registered pet' : 'Lost report',
                side: Map<String, dynamic>.from((isPet ? m['pet'] : m['lost']) ?? {}),
                isPet: isPet,
              ),
              _Breakdown(Map<String, dynamic>.from(m['breakdown'] ?? {})),
              _AiPanel(Map<String, dynamic>.from(m['ai'] ?? {})),
              if (m['reviewNote'] != null)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('Review note: ${m['reviewNote']}', style: const TextStyle(fontStyle: FontStyle.italic)),
                ),
              if (status == 'confirmed')
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(m['notifiedAt'] != null ? 'Owner and finder emailed ${shortDate(m['notifiedAt'])}' : 'Email could not be sent; both users can see it in the app.'),
                ),
              if (status == 'suggested') ...[
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _busy ? null : () => _decide('reject'),
                      icon: const Icon(Icons.close),
                      label: const Text('Not the same'),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.red.shade700, minimumSize: const Size(0, 48)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: _busy ? null : () => _decide('confirm'),
                      icon: const Icon(Icons.check, color: Colors.white),
                      label: const Text('Confirm & notify', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.green.shade700, minimumSize: const Size(0, 48)),
                    ),
                  ),
                ]),
              ],
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }
}

class _Side extends StatelessWidget {
  final String title;
  final Map<String, dynamic> side;
  final bool isPet;
  const _Side({required this.title, required this.side, this.isPet = false});

  @override
  Widget build(BuildContext context) {
    final images = List<String>.from(side['images'] ?? []);
    Widget row(String label, dynamic value) => value == null || '$value'.isEmpty
        ? const SizedBox.shrink()
        : Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Text.rich(TextSpan(children: [
              TextSpan(text: '$label: ', style: const TextStyle(fontWeight: FontWeight.bold)),
              TextSpan(text: '$value'),
            ])),
          );

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: adminBrown)),
            const SizedBox(height: 8),
            if (images.isNotEmpty)
              Wrap(spacing: 8, runSpacing: 8, children: images.map((p) => ClipRRect(borderRadius: BorderRadius.circular(8), child: sourceImage(p, size: 140))).toList())
            else
              const Text('No photo', style: TextStyle(color: adminLightBrown)),
            const SizedBox(height: 8),
            if (isPet) row('Pet ID', side['petId']),
            row('Name', side['petName']),
            row('Species', side['species']),
            row('Breed', side['breed']),
            row('Colour', side['color']),
            if (isPet) row('Owner', side['ownerName']),
            if (!isPet) ...[
              row(side['reportType'] == 'found' ? 'Found at' : 'Last seen', side['location']),
              row('Date', side['date'] != null ? shortDate(side['date']) : null),
              row('Tag Pet ID', side['tagPetId']),
              row('Description', side['description']),
              row('Reported by', side['reporterName']),
              row('Contact', side['contactInfo']),
              row('Status', side['status']),
            ],
          ],
        ),
      ),
    );
  }
}

class _Breakdown extends StatelessWidget {
  final Map<String, dynamic> b;
  const _Breakdown(this.b);

  @override
  Widget build(BuildContext context) {
    Widget line(String label, dynamic points, int max, [String? extra]) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(children: [
            SizedBox(width: 80, child: Text(label)),
            Expanded(
              child: LinearProgressIndicator(
                value: max == 0 ? 0 : ((points ?? 0) as num) / max,
                minHeight: 8,
                backgroundColor: adminCream,
                color: adminLightBrown,
                borderRadius: BorderRadius.circular(4),
              ),
            ),
            const SizedBox(width: 8),
            Text('${points ?? 0}/$max${extra != null ? ' · $extra' : ''}', style: const TextStyle(fontSize: 12)),
          ]),
        );

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Why it was suggested', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: adminBrown)),
            const SizedBox(height: 8),
            if (b['tagMatch'] == true)
              const Padding(
                padding: EdgeInsets.only(bottom: 6),
                child: Text('The Pet ID on the collar tag matches this registered pet.', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
              ),
            line('Species', b['species'], 25),
            line('Breed', b['breed'], 25),
            line('Colour', b['colour'], 20),
            line('Distance', b['distance'], 15, b['distanceKm'] != null ? '${b['distanceKm']} km' : 'unknown'),
            line('Time', b['time'], 15, b['daysApart'] != null ? '${b['daysApart']} days' : 'unknown'),
          ],
        ),
      ),
    );
  }
}

class _AiPanel extends StatelessWidget {
  final Map<String, dynamic> ai;
  const _AiPanel(this.ai);

  @override
  Widget build(BuildContext context) {
    final reasons = List<String>.from((ai['reasons'] ?? []).map((r) => '$r'));
    final verdict = ai['verdict'];
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: adminCream,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              const Icon(Icons.auto_awesome, color: adminLightBrown),
              const SizedBox(width: 8),
              const Text('AI photo check', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: adminBrown)),
              const Spacer(),
              if (verdict != null) StatusChip('$verdict'.toUpperCase(), adminBrown),
            ]),
            const SizedBox(height: 6),
            if (verdict == null && ai['error'] == null)
              const Text('Not configured yet. Compare the photos yourself before confirming.')
            else if (ai['error'] != null)
              Text('The AI check failed: ${ai['error']}', style: TextStyle(color: Colors.red.shade700))
            else ...[
              if (ai['score'] != null) Text('Similarity: ${ai['score']}/100'),
              ...reasons.map((r) => Text('• $r')),
            ],
          ],
        ),
      ),
    );
  }
}
