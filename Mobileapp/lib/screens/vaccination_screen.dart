import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/vaccination_service.dart';
import '../services/pet_service.dart';
import '../services/auth_service.dart';

class VaccinationScreen extends StatefulWidget {
  const VaccinationScreen({super.key});

  @override
  State<VaccinationScreen> createState() => _VaccinationScreenState();
}

class _VaccinationScreenState extends State<VaccinationScreen> {
  List<dynamic> _upcomingVaccinations = [];
  List<dynamic> _pets = [];
  Map<String, List<dynamic>> _petVaccinations = {};
  String _selectedPetId = 'all';
  bool _loading = true;
  String _error = '';

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  Future<void> _loadAll() async {
    setState(() { _loading = true; _error = ''; });
    try {
      final userId = await AuthService().getUserId();
      final petsData = userId != null ? await PetService().getUserPets(userId) : <dynamic>[];
      final upcoming = await VaccinationService().getUpcomingUserVaccinations();

      if (!mounted) return;
      setState(() {
        _pets = petsData;
        _upcomingVaccinations = upcoming;
        _loading = false;
      });

      // Load full history for each pet
      for (final pet in petsData) {
        final petMongoId = pet['_id']?.toString();
        if (petMongoId != null) {
          try {
            final history = await VaccinationService().getPetVaccinations(petMongoId);
            if (mounted) {
              setState(() {
                _petVaccinations[petMongoId] = history;
              });
            }
          } catch (_) {
            // Workaround: Fallback to the working 'upcoming' list to show at least some data
            final filteredHistory = upcoming.where((v) {
              final p = v['pet'];
              if (p is Map) return p['_id']?.toString() == petMongoId;
              return p?.toString() == petMongoId;
            }).toList();

            if (mounted) {
              setState(() {
                _petVaccinations[petMongoId] = filteredHistory;
              });
            }
          }
        }
      }
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  int _getDaysDiff(String? dateStr) {
    if (dateStr == null) return 9999;
    try {
      final target = DateTime.parse(dateStr);
      return target.difference(DateTime.now()).inDays;
    } catch (_) {
      return 9999;
    }
  }

  Color _getStatusColor(int days) {
    if (days < 0) return Colors.red.shade600;
    if (days <= 7) return Colors.orange.shade700;
    if (days <= 30) return const Color(0xFFE6A565);
    return AppTheme.primaryBrown;
  }

  String _getStatusText(int days) {
    if (days < 0) return 'Overdue by ${days.abs()} day${days.abs() != 1 ? 's' : ''}';
    if (days == 0) return 'Due Today!';
    if (days <= 7) return 'Due in $days day${days != 1 ? 's' : ''}';
    return 'Due in $days days';
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text("Vaccination Schedule"),
        backgroundColor: AppTheme.primaryBrown,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadAll,
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppTheme.primaryBrown))
          : _error.isNotEmpty
              ? Center(child: Text(_error, style: const TextStyle(color: Colors.red), textAlign: TextAlign.center))
              : RefreshIndicator(
                  onRefresh: _loadAll,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // ─── Section 1: Upcoming Vaccinations ──────────────────
                        _sectionHeader("🔔 Upcoming Vaccinations"),
                        const SizedBox(height: 8),

                        // Pet filter if multiple pets
                        if (_pets.length > 1) ...[
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppTheme.secondaryGold),
                            ),
                            child: DropdownButtonHideUnderline(
                              child: DropdownButton<String>(
                                value: _selectedPetId,
                                isExpanded: true,
                                items: [
                                  const DropdownMenuItem(value: 'all', child: Text('All Pets')),
                                  ..._pets.map((p) => DropdownMenuItem(
                                    value: p['_id']?.toString() ?? '',
                                    child: Text('${p['petType'] ?? ''} - ${p['petName'] ?? ''}'),
                                  )),
                                ],
                                onChanged: (v) => setState(() => _selectedPetId = v ?? 'all'),
                              ),
                            ),
                          ),
                          const SizedBox(height: 12),
                        ],

                        // Upcoming list
                        Builder(builder: (_) {
                          final filtered = _selectedPetId == 'all'
                              ? _upcomingVaccinations
                              : _upcomingVaccinations.where((v) => v['pet']?['_id']?.toString() == _selectedPetId).toList();

                          if (filtered.isEmpty) {
                            return _emptyCard("All pets are up to date! No upcoming vaccinations.");
                          }
                          return Column(
                            children: filtered.map((vacc) => _buildUpcomingCard(vacc)).toList(),
                          );
                        }),

                        const SizedBox(height: 28),

                        // ─── Section 2: Full History Per Pet ───────────────────
                        _sectionHeader("📋 Complete Vaccination History"),
                        const SizedBox(height: 8),

                        if (_pets.isEmpty)
                          _emptyCard("No registered pets found."),

                        ..._pets.map((pet) {
                          final petId = pet['_id']?.toString() ?? '';
                          final history = _petVaccinations[petId] ?? [];
                          return _buildHistorySection(pet, history);
                        }),

                        const SizedBox(height: 40),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _sectionHeader(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: AppTheme.primaryText,
      ),
    );
  }

  Widget _emptyCard(String message) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Text(
        message,
        textAlign: TextAlign.center,
        style: const TextStyle(color: Colors.grey, fontSize: 15),
      ),
    );
  }

  Widget _buildUpcomingCard(Map<String, dynamic> vacc) {
    final nextDue = vacc['nextDueDate']?.toString();
    final days = _getDaysDiff(nextDue);
    final statusColor = _getStatusColor(days);
    final statusText = _getStatusText(days);
    final petName = vacc['pet']?['petName'] ?? vacc['petName'] ?? 'Unknown Pet';
    final petType = vacc['pet']?['petType'] ?? '';
    final petBreed = vacc['pet']?['breed'] ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor, width: 2),
        boxShadow: [BoxShadow(color: Colors.black.withAlpha(15), blurRadius: 8, offset: const Offset(0, 4))],
      ),
      child: Column(
        children: [
          // Color top bar
          Container(
            height: 4,
            decoration: BoxDecoration(
              color: statusColor,
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(14), topRight: Radius.circular(14)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(petName, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppTheme.primaryText)),
                          if (petType.isNotEmpty || petBreed.isNotEmpty)
                            Text('$petType • $petBreed', style: const TextStyle(fontSize: 13, color: Colors.grey)),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        statusText,
                        style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                _infoGrid([
                  {'label': 'Vaccine', 'value': vacc['vaccineName'] ?? 'Unknown'},
                  {'label': 'Type', 'value': vacc['vaccineType'] ?? 'Unknown'},
                  {'label': 'Due Date', 'value': _formatDate(nextDue)},
                  {'label': 'Veterinarian', 'value': vacc['veterinarianName'] ?? 'N/A'},
                  if (vacc['clinicName'] != null) {'label': 'Clinic', 'value': vacc['clinicName']},
                ]),
                if (vacc['notes'] != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFFF8EC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppTheme.secondaryGold.withAlpha(120)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.note, size: 16, color: AppTheme.primaryBrown),
                        const SizedBox(width: 6),
                        Expanded(child: Text(vacc['notes'], style: const TextStyle(fontSize: 13, color: AppTheme.primaryText))),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistorySection(Map<String, dynamic> pet, List<dynamic> vaccinations) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.primaryBrown.withAlpha(20),
              borderRadius: const BorderRadius.only(topLeft: Radius.circular(14), topRight: Radius.circular(14)),
            ),
            child: Row(
              children: [
                const Icon(Icons.pets, color: AppTheme.primaryBrown, size: 20),
                const SizedBox(width: 8),
                Text(
                  "${pet['petName'] ?? 'Pet'}'s Vaccination History",
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryText),
                ),
              ],
            ),
          ),
          if (vaccinations.isEmpty)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Text('No vaccination records found.', style: TextStyle(color: Colors.grey)),
            )
          else
            ...vaccinations.asMap().entries.map((entry) {
              final vacc = entry.value;
              final isLast = entry.key == vaccinations.length - 1;
              final nextDue = vacc['nextDueDate']?.toString();
              final days = _getDaysDiff(nextDue);
              final statusColor = _getStatusColor(days);
              final status = vacc['status']?.toString() ?? 'unknown';

              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Timeline dot
                        Column(
                          children: [
                            Container(
                              width: 12, height: 12,
                              decoration: BoxDecoration(
                                color: statusColor,
                                shape: BoxShape.circle,
                              ),
                            ),
                            if (!isLast)
                              Container(width: 2, height: 50, color: Colors.grey.shade200),
                          ],
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      vacc['vaccineName'] ?? 'Unknown Vaccine',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppTheme.primaryText),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: status == 'administered' ? Colors.green.shade100 : Colors.orange.shade100,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      status.toUpperCase(),
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: status == 'administered' ? Colors.green.shade800 : Colors.orange.shade800,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(vacc['vaccineType'] ?? '', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                              const SizedBox(height: 6),
                              Row(
                                children: [
                                  const Icon(Icons.calendar_today, size: 12, color: Colors.grey),
                                  const SizedBox(width: 4),
                                  Text('Given: ${_formatDate(vacc['dateAdministered']?.toString())}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                  const SizedBox(width: 12),
                                  Icon(Icons.schedule, size: 12, color: statusColor),
                                  const SizedBox(width: 4),
                                  Text('Next: ${_formatDate(nextDue)}', style: TextStyle(fontSize: 12, color: statusColor, fontWeight: FontWeight.w600)),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text('Dr. ${vacc['veterinarianName'] ?? 'N/A'}', style: const TextStyle(fontSize: 12, color: AppTheme.primaryBrown)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (!isLast) Divider(height: 0, indent: 40, color: Colors.grey.shade100),
                ],
              );
            }),
        ],
      ),
    );
  }

  Widget _infoGrid(List<Map<String, String>> items) {
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      children: items.map((item) => SizedBox(
        width: (MediaQuery.of(context).size.width - 96) / 2,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item['label']!.toUpperCase(), style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.w700, letterSpacing: 0.5)),
            Text(item['value']!, style: const TextStyle(fontSize: 14, color: AppTheme.primaryText)),
          ],
        ),
      )).toList(),
    );
  }
}
