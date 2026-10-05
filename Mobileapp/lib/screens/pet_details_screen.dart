import 'package:flutter/material.dart';
import 'dart:convert';
import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../services/vaccination_service.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_client.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class PetDetailsScreen extends StatefulWidget {
  final Map<String, dynamic> pet;
  const PetDetailsScreen({super.key, required this.pet});

  @override
  State<PetDetailsScreen> createState() => _PetDetailsScreenState();
}

class _PetDetailsScreenState extends State<PetDetailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<dynamic> _vaccinations = [];
  bool _vaccLoading = true;
  bool _downloadingQR = false;
  bool _uploadingPhoto = false;

  late Map<String, dynamic> _pet;

  @override
  void initState() {
    super.initState();
    _pet = Map<String, dynamic>.from(widget.pet);
    _tabController = TabController(length: 3, vsync: this);
    _loadVaccinations();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadVaccinations() async {
    final petMongoId = _pet['_id']?.toString();
    if (petMongoId == null) {
      setState(() => _vaccLoading = false);
      return;
    }
    try {
      final results =
          await VaccinationService().getPetVaccinations(petMongoId);
      if (mounted) {
        setState(() {
          _vaccinations = results;
          _vaccLoading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _vaccLoading = false);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  String _formatDate(String? d) {
    if (d == null) return 'N/A';
    try {
      final dt = DateTime.parse(d);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return d;
    }
  }

  int _getDaysDiff(String? d) {
    if (d == null) return 9999;
    try {
      return DateTime.parse(d).difference(DateTime.now()).inDays;
    } catch (_) {
      return 9999;
    }
  }

  Color _statusColor(int days) {
    if (days < 0) return Colors.red.shade600;
    if (days <= 7) return Colors.orange.shade700;
    if (days <= 30) return const Color(0xFFE6A565);
    return AppTheme.primaryBrown;
  }

  /// Same logic as the web's getPetImages utility
  List<String> _getPetImages() {
    final photos = _pet['photoUrls'];
    if (photos is List) {
      return photos.whereType<String>().where((s) => s.isNotEmpty).toList();
    }
    final photoUrl = _pet['photoUrl'];
    if (photoUrl is String && photoUrl.isNotEmpty) return [photoUrl];
    return [];
  }

  String? _resolveHeroImage() {
    final imgs = _getPetImages();
    if (imgs.isNotEmpty) return imgs.first;
    return null;
  }

  ImageProvider _buildImageProvider(String? path,
      {ImageProvider? fallback}) {
    if (path == null) return fallback ?? const AssetImage('assets/images/dashboard_cat.png');
    if (path.startsWith('http')) return NetworkImage(path);
    if (path.startsWith('data:image')) {
      try {
        return MemoryImage(base64Decode(path.split(',').last));
      } catch (_) {}
    }
    return fallback ?? const AssetImage('assets/images/dashboard_cat.png');
  }

  // ─── QR Download ───────────────────────────────────────────────────────────

  Future<void> _downloadQR() async {
    final qrCode = _pet['qrCode']?.toString();
    final petName = _pet['petName']?.toString() ?? 'pet';

    if (qrCode == null || qrCode.isEmpty) {
      _showSnack('No QR code available for this pet.', isError: true);
      return;
    }

    setState(() => _downloadingQR = true);
    try {
      Uint8List qrBytes;

      if (qrCode.startsWith('data:image')) {
        // Base64-encoded QR
        qrBytes = base64Decode(qrCode.split(',').last);
      } else if (qrCode.startsWith('http')) {
        // Remote URL — download it
        final resp = await http.get(Uri.parse(qrCode));
        if (resp.statusCode != 200) throw Exception('Download failed');
        qrBytes = resp.bodyBytes;
      } else {
        throw Exception('Unsupported QR format');
      }

      // Save to app documents directory (works on Android/iOS without extra permissions)
      final dir = await getApplicationDocumentsDirectory();
      final fileName = '${petName.replaceAll(' ', '_')}_QRCode.png';
      final file = File('${dir.path}/$fileName');
      await file.writeAsBytes(qrBytes);

      if (mounted) {
        _showSnack('QR saved to: ${file.path}');
        // Show share/view dialog
        _showQRSavedDialog(file.path, petName);
      }
    } catch (e) {
      if (mounted) _showSnack('Failed to download QR: $e', isError: true);
    } finally {
      if (mounted) setState(() => _downloadingQR = false);
    }
  }

  void _showQRSavedDialog(String filePath, String petName) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.green),
            const SizedBox(width: 8),
            Text('QR Saved', style: TextStyle(color: AppTheme.primaryBrown)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('QR Code for $petName has been saved.'),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.folder, size: 16, color: Colors.grey),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      filePath,
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 16),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: filePath));
                      _showSnack('Path copied!');
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK')),
        ],
      ),
    );
  }

  // ─── Photo Upload ───────────────────────────────────────────────────────────

  Future<void> _handlePhotoUpload() async {
    final picker = ImagePicker();
    final currentPhotos = _getPetImages();

    if (currentPhotos.length >= 2) {
      _showSnack('Maximum 2 images allowed. Remove one first.', isError: true);
      return;
    }

    final XFile? picked = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
      maxWidth: 1200,
    );
    if (picked == null) return;

    setState(() => _uploadingPhoto = true);
    try {
      final bytes = await picked.readAsBytes();
      final ext = picked.name.split('.').last.toLowerCase();
      final mimeType = ext == 'png' ? 'image/png' : 'image/jpeg';
      final base64Str = 'data:$mimeType;base64,${base64Encode(bytes)}';

      final newPhotos = [...currentPhotos, base64Str];
      await _updatePetPhotos(newPhotos);
    } catch (e) {
      if (mounted) _showSnack('Failed to upload photo: $e', isError: true);
    } finally {
      if (mounted) setState(() => _uploadingPhoto = false);
    }
  }

  Future<void> _handleRemovePhoto(int index) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Remove Photo'),
        content: const Text('Are you sure you want to remove this photo?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    final remaining = _getPetImages()
        .whereType<String>()
        .toList()
      ..removeAt(index);
    await _updatePetPhotos(remaining);
  }

  Future<void> _updatePetPhotos(List<String> photoUrls) async {
    final petMongoId = _pet['_id']?.toString();
    if (petMongoId == null) return;

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('token');
      final url =
          Uri.parse('${ApiClient.baseUrl}/api/pets/$petMongoId/photos');

      final resp = await http.put(
        url,
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'photoUrls': photoUrls}),
      );

      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        final updatedPet = data['pet'] ?? data;
        if (mounted) {
          setState(() {
            _pet = Map<String, dynamic>.from(updatedPet is Map ? updatedPet : _pet);
            // If API doesn't return updated pet, update photos manually
            if (updatedPet is! Map) {
              _pet['photoUrls'] = photoUrls;
            }
          });
          _showSnack('Photos updated successfully!');
        }
      } else {
        throw Exception('Status ${resp.statusCode}: ${resp.body}');
      }
    } catch (e) {
      if (mounted) _showSnack('Failed to update photos: $e', isError: true);
    }
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: isError ? Colors.red.shade700 : AppTheme.primaryBrown,
      behavior: SnackBarBehavior.floating,
    ));
  }

  // ─── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final pet = _pet;
    final String name = pet['petName'] ?? 'Unknown Pet';
    final String rawBreed = pet['breed'] ?? '';
    final String breed = rawBreed == 'Other' ? (pet['breedOther'] ?? 'Other') : rawBreed;
    final String rawType = pet['petType'] ?? '';
    final String type = rawType == 'Other' ? (pet['petTypeOther'] ?? 'Other') : rawType;

    final int ageYears =
        (pet['age'] is Map) ? ((pet['age']['years'] ?? 0) as num).toInt() : 0;
    final int ageMonths =
        (pet['age'] is Map) ? ((pet['age']['months'] ?? 0) as num).toInt() : 0;
    final String gender = pet['gender'] ?? 'Unknown';
    final String color = pet['color'] ?? 'Unknown';
    final String weight = pet['weight'] != null ? '${pet['weight']} kg' : 'N/A';
    final String microchip = pet['microchipNumber'] ?? 'N/A';

    final medicalHistory =
        (pet['medicalHistory'] is Map) ? pet['medicalHistory'] : {};
    final bool hasMedical =
        (medicalHistory['allergies'] ?? '').toString().isNotEmpty ||
            (medicalHistory['existingConditions'] ?? '').toString().isNotEmpty ||
            (medicalHistory['specialNotes'] ?? '').toString().isNotEmpty;

    final String? heroImage = _resolveHeroImage();
    final imageProvider = _buildImageProvider(heroImage);

    return Scaffold(
      backgroundColor: AppTheme.background,
      body: NestedScrollView(
        headerSliverBuilder: (_, __) => [
          SliverAppBar(
            expandedHeight: 260,
            pinned: true,
            backgroundColor: AppTheme.primaryBrown,
            foregroundColor: Colors.white,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                name,
                style: const TextStyle(
                    color: Colors.white, fontWeight: FontWeight.bold),
              ),
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image(
                    image: imageProvider,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      color: AppTheme.primaryBrown,
                      child: const Icon(Icons.pets, size: 80, color: Colors.white30),
                    ),
                  ),
                  Container(
                    decoration: const BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black54],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            bottom: TabBar(
              controller: _tabController,
              indicatorColor: AppTheme.secondaryGold,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white60,
              tabs: const [
                Tab(text: 'Details'),
                Tab(text: 'QR Code'),
                Tab(text: 'Vaccinations'),
              ],
            ),
          ),
        ],
        body: TabBarView(
          controller: _tabController,
          children: [
            // ─── Tab 1: Details ───────────────────────────────────
            SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '$type • $breed',
                    style:
                        const TextStyle(fontSize: 16, color: AppTheme.primaryBrown),
                  ),
                  const SizedBox(height: 20),

                  // Pet Images Section (matches web photo management)
                  _sectionTitle('Pet Images'),
                  const SizedBox(height: 10),
                  _buildPhotosSection(),

                  const SizedBox(height: 20),
                  _sectionTitle('Basic Information'),
                  const SizedBox(height: 10),
                  _infoCard([
                    _infoRow('Pet ID', pet['petId']?.toString() ?? 'N/A'),
                    _infoRow('Type', type),
                    _infoRow('Breed', breed),
                    _infoRow('Age', '$ageYears yrs $ageMonths mo'),
                    _infoRow('Gender', gender),
                    _infoRow('Color', color),
                    _infoRow('Weight', weight),
                    if (microchip != 'N/A')
                      _infoRow('Microchip', microchip),
                  ]),

                  if (hasMedical) ...[
                    const SizedBox(height: 20),
                    _sectionTitle('Medical History'),
                    const SizedBox(height: 10),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFDECEA),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.red.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(children: [
                            Icon(Icons.warning_amber_rounded,
                                color: Colors.red, size: 18),
                            SizedBox(width: 6),
                            Text('Medical Alerts',
                                style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.red)),
                          ]),
                          const SizedBox(height: 10),
                          if ((medicalHistory['allergies'] ?? '').isNotEmpty)
                            _medRow('Allergies', medicalHistory['allergies']),
                          if ((medicalHistory['existingConditions'] ?? '').isNotEmpty)
                            _medRow('Conditions',
                                medicalHistory['existingConditions']),
                          if ((medicalHistory['specialNotes'] ?? '').isNotEmpty)
                            _medRow('Notes', medicalHistory['specialNotes']),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 40),
                ],
              ),
            ),

            // ─── Tab 2: QR Code ───────────────────────────────────
            SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  const Icon(Icons.qr_code_2,
                      size: 48, color: AppTheme.primaryBrown),
                  const SizedBox(height: 12),
                  Text(
                    name,
                    style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.primaryText),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Pet ID: ${pet['petId'] ?? 'N/A'}',
                    style: const TextStyle(color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                          color: AppTheme.secondaryGold, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(20),
                          blurRadius: 15,
                          offset: const Offset(0, 6),
                        )
                      ],
                    ),
                    child: Column(
                      children: [
                        if (pet['qrCode'] != null &&
                            pet['qrCode'].toString().isNotEmpty)
                          _renderQR(pet['qrCode'].toString())
                        else
                          Container(
                            width: 200,
                            height: 200,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.qr_code,
                                    size: 60, color: Colors.grey),
                                SizedBox(height: 8),
                                Text(
                                  'QR Code not available yet.\nContact admin.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      color: Colors.grey, fontSize: 13),
                                ),
                              ],
                            ),
                          ),
                        const SizedBox(height: 20),
                        const Text(
                          'This QR code uniquely identifies your pet.\nShow it at vet clinics or scan to view pet profile.',
                          textAlign: TextAlign.center,
                          style:
                              TextStyle(color: Colors.grey, fontSize: 12),
                        ),
                        const SizedBox(height: 20),
                        ElevatedButton.icon(
                          onPressed: _downloadingQR ? null : _downloadQR,
                          icon: _downloadingQR
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                      color: Colors.white, strokeWidth: 2),
                                )
                              : const Icon(Icons.download),
                          label: Text(_downloadingQR
                              ? 'Downloading...'
                              : 'Download QR Code'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.primaryBrown,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 48),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),

            // ─── Tab 3: Vaccinations ──────────────────────────────
            _vaccLoading
                ? const Center(
                    child: CircularProgressIndicator(
                        color: AppTheme.primaryBrown))
                : _vaccinations.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.vaccines,
                                size: 60, color: Colors.grey),
                            const SizedBox(height: 12),
                            Text(
                              'No vaccination records for $name yet.',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  color: Colors.grey, fontSize: 15),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _vaccinations.length,
                        separatorBuilder: (_, _) =>
                            const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final vacc = _vaccinations[index];
                          final nextDue =
                              vacc['nextDueDate']?.toString();
                          final days = _getDaysDiff(nextDue);
                          final statusCol = _statusColor(days);
                          final status =
                              vacc['status']?.toString() ?? '';

                          return Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(
                                  color: statusCol.withAlpha(80),
                                  width: 1.5),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withAlpha(10),
                                  blurRadius: 6,
                                  offset: const Offset(0, 3),
                                )
                              ],
                            ),
                            child: Column(
                              children: [
                                Container(
                                  height: 4,
                                  decoration: BoxDecoration(
                                    color: statusCol,
                                    borderRadius: const BorderRadius.only(
                                      topLeft: Radius.circular(13),
                                      topRight: Radius.circular(13),
                                    ),
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              vacc['vaccineName'] ??
                                                  'Unknown',
                                              style: const TextStyle(
                                                fontSize: 16,
                                                fontWeight: FontWeight.bold,
                                                color: AppTheme.primaryText,
                                              ),
                                            ),
                                          ),
                                          Container(
                                            padding:
                                                const EdgeInsets.symmetric(
                                                    horizontal: 10,
                                                    vertical: 4),
                                            decoration: BoxDecoration(
                                              color: status == 'administered'
                                                  ? Colors.green.shade100
                                                  : Colors.orange.shade100,
                                              borderRadius:
                                                  BorderRadius.circular(20),
                                            ),
                                            child: Text(
                                              status.toUpperCase(),
                                              style: TextStyle(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: status == 'administered'
                                                    ? Colors.green.shade800
                                                    : Colors.orange.shade800,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(vacc['vaccineType'] ?? '',
                                          style: const TextStyle(
                                              color: Colors.grey,
                                              fontSize: 13)),
                                      const SizedBox(height: 10),
                                      Row(children: [
                                        const Icon(Icons.calendar_today,
                                            size: 13, color: Colors.grey),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Administered: ${_formatDate(vacc['dateAdministered']?.toString())}',
                                          style: const TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey),
                                        ),
                                      ]),
                                      const SizedBox(height: 4),
                                      Row(children: [
                                        Icon(Icons.schedule,
                                            size: 13, color: statusCol),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Next Due: ${_formatDate(nextDue)}',
                                          style: TextStyle(
                                              fontSize: 12,
                                              color: statusCol,
                                              fontWeight: FontWeight.w600),
                                        ),
                                      ]),
                                      const SizedBox(height: 4),
                                      Row(children: [
                                        const Icon(Icons.person,
                                            size: 13,
                                            color: AppTheme.primaryBrown),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Dr. ${vacc['veterinarianName'] ?? 'N/A'}',
                                          style: const TextStyle(
                                              fontSize: 12,
                                              color: AppTheme.primaryBrown),
                                        ),
                                        if (vacc['clinicName'] != null) ...[
                                          const Text(' • ',
                                              style: TextStyle(
                                                  color: Colors.grey)),
                                          Expanded(
                                            child: Text(
                                              vacc['clinicName'],
                                              style: const TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.grey),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ]
                                      ]),
                                      if (vacc['notes'] != null) ...[
                                        const SizedBox(height: 8),
                                        Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color:
                                                const Color(0xFFFFF8EC),
                                            borderRadius:
                                                BorderRadius.circular(8),
                                          ),
                                          child: Text(vacc['notes'],
                                              style: const TextStyle(
                                                  fontSize: 12,
                                                  color: AppTheme.primaryText)),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ],
        ),
      ),
    );
  }

  // ─── Photo Section Widget ────────────────────────────────────────────────

  Widget _buildPhotosSection() {
    final photos = _getPetImages();
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withAlpha(8),
              blurRadius: 6,
              offset: const Offset(0, 3))
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photos.isEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: const Column(
                children: [
                  Icon(Icons.add_photo_alternate,
                      size: 48, color: Colors.grey),
                  SizedBox(height: 8),
                  Text('No pet images uploaded yet.',
                      style: TextStyle(color: Colors.grey)),
                ],
              ),
            )
          else
            GridView.count(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: List.generate(photos.length, (i) {
                final imgProvider = _buildImageProvider(photos[i]);
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(10),
                      child: Image(
                        image: imgProvider,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => Container(
                          color: Colors.grey.shade200,
                          child: const Icon(Icons.broken_image,
                              color: Colors.grey),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 6,
                      right: 6,
                      child: GestureDetector(
                        onTap: () => _handleRemovePhoto(i),
                        child: Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Colors.red,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.close,
                              size: 14, color: Colors.white),
                        ),
                      ),
                    ),
                  ],
                );
              }),
            ),
          const SizedBox(height: 12),
          if (photos.length < 2)
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _uploadingPhoto ? null : _handlePhotoUpload,
                icon: _uploadingPhoto
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child:
                            CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.add_photo_alternate),
                label: Text(_uploadingPhoto
                    ? 'Uploading...'
                    : 'Upload Pet Image'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppTheme.primaryBrown,
                  side: const BorderSide(color: AppTheme.primaryBrown),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ),
          const SizedBox(height: 4),
          const Text(
            'Maximum 2 images. JPEG or PNG; up to 2 MB each.',
            style: TextStyle(fontSize: 11, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  // ─── Helper Widgets ──────────────────────────────────────────────────────

  Widget _sectionTitle(String t) => Text(t,
      style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: AppTheme.primaryText));

  Widget _infoCard(List<Widget> children) => Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withAlpha(8),
                blurRadius: 6,
                offset: const Offset(0, 3))
          ],
        ),
        child: Column(children: children),
      );

  Widget _infoRow(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 110,
              child: Text(label,
                  style: const TextStyle(
                      color: Colors.grey,
                      fontWeight: FontWeight.w600,
                      fontSize: 13)),
            ),
            Expanded(
                child: Text(value,
                    style: const TextStyle(
                        color: AppTheme.primaryText, fontSize: 14))),
          ],
        ),
      );

  Widget _medRow(String label, String value) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$label: ',
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    color: Colors.red,
                    fontSize: 13)),
            Expanded(
                child: Text(value,
                    style: const TextStyle(
                        color: Colors.black87, fontSize: 13))),
          ],
        ),
      );

  Widget _renderQR(String qrString) {
    try {
      if (qrString.startsWith('data:image')) {
        return Image.memory(
          base64Decode(qrString.split(',').last),
          width: 220,
          height: 220,
          fit: BoxFit.contain,
        );
      } else if (qrString.startsWith('http')) {
        return Image.network(
          qrString,
          width: 220,
          height: 220,
          fit: BoxFit.contain,
          errorBuilder: (ctx, err, st) =>
              const Icon(Icons.broken_image, size: 80, color: Colors.grey),
        );
      }
    } catch (e) {}
    return const Icon(Icons.broken_image, size: 80, color: Colors.grey);
  }
}

