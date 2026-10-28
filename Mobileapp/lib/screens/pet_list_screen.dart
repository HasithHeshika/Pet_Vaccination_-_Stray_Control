import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'dart:convert' as dart_convert;
import '../theme/app_theme.dart';
import '../services/pet_service.dart';
import '../services/auth_service.dart';
import 'pet_details_screen.dart';
import 'login_screen.dart';
import 'vaccination_screen.dart';
import 'report_lost_screen.dart';

class PetListScreen extends StatefulWidget {
  const PetListScreen({super.key});

  @override
  State<PetListScreen> createState() => _PetListScreenState();
}

class _PetListScreenState extends State<PetListScreen> {
  late Future<List<dynamic>> _petsFuture;

  @override
  void initState() {
    super.initState();
    _petsFuture = _loadPets();
  }

  void _reload() {
    setState(() {
      _petsFuture = _loadPets();
    });
  }

  Future<List<dynamic>> _loadPets() async {
    final userId = await AuthService().getUserId();
    if (userId == null || userId.isEmpty) {
      return [];
    }
    return await PetService().getUserPets(userId);
  }

  String? _resolveImage(Map<String, dynamic> pet) {
    final photos = pet['photoUrls'];
    if (photos is List && photos.isNotEmpty) {
      final first = photos[0];
      if (first is String && first.isNotEmpty) return first;
    }
    final photoUrl = pet['photoUrl'];
    if (photoUrl is String && photoUrl.isNotEmpty) return photoUrl;
    return null;
  }

  void _showQrDialog(Map<String, dynamic> pet) {
    final name = pet['petName'] ?? 'Pet';
    final qrData = pet['qrCode']?.toString();
    final id = pet['_id']?.toString() ?? 'ID-VERIFIED';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Color(0xFFFDFBF7),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 44,
              height: 5,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
            ),
            Row(
              children: [
                const Icon(Icons.qr_code_2, color: Color(0xFF8B5A2B), size: 28),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    "$name's Digital Tag",
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // QR Code Box
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFDEC49B), width: 1.5),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 4))
                ],
              ),
              child: qrData != null && qrData.isNotEmpty
                  ? (qrData.startsWith('data:image')
                      ? Image.memory(dart_convert.base64Decode(qrData.split(',').last), width: 190, height: 190, fit: BoxFit.contain)
                      : (qrData.startsWith('http')
                          ? Image.network(qrData, width: 190, height: 190, fit: BoxFit.contain)
                          : const Icon(Icons.qr_code, size: 160, color: Color(0xFF5C4033))))
                  : const Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.qr_code, size: 140, color: Color(0xFF8B5A2B)),
                        SizedBox(height: 6),
                        Text("Government Verified ID", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF5C4033))),
                      ],
                    ),
            ),
            const SizedBox(height: 16),
            Text(
              "Registration Tag: #LK-PET-${id.length > 6 ? id.substring(id.length - 6).toUpperCase() : id}",
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF8B5A2B)),
            ),
            const SizedBox(height: 4),
            const Text(
              "Scan this collar code to view verified rabies vaccination history.",
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Color(0xFF7A6458)),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton.icon(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: "https://petnexus.gov.lk/pet/$id"));
                  Navigator.pop(ctx);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text("Pet profile link copied to clipboard!")),
                  );
                },
                icon: const Icon(Icons.copy, size: 16),
                label: const Text("Copy Digital ID Link", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5A2B),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showRegistrationRoadmapModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Color(0xFFFDFBF7),
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 44,
                height: 5,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(10)),
              ),
            ),
            Row(
              children: [
                const Icon(Icons.how_to_reg, color: Color(0xFF8B5A2B), size: 26),
                const SizedBox(width: 10),
                const Text(
                  "How to Register Your Pet",
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                ),
              ],
            ),
            const SizedBox(height: 16),
            _buildRoadmapStep(
              "1",
              "Visit Authorized Clinic or Municipality",
              "Bring your pet to a registered municipal vet for physical inspection, microchipping, and rabies vaccination.",
            ),
            const SizedBox(height: 12),
            _buildRoadmapStep(
              "2",
              "Authority Issues Pet ID",
              "The veterinarian records vaccination batches and issues a verified municipal registration profile.",
            ),
            const SizedBox(height: 12),
            _buildRoadmapStep(
              "3",
              "Digital Passport Appears Here",
              "Your pet profile, digital QR tag, and booster schedule automatically appear in this section.",
            ),
            const SizedBox(height: 22),
            SizedBox(
              width: double.infinity,
              height: 46,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(ctx),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5C4033),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Text("Got It", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildRoadmapStep(String step, String title, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 13,
          backgroundColor: const Color(0xFFDEC49B),
          child: Text(step, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF5C4033))),
              const SizedBox(height: 2),
              Text(desc, style: const TextStyle(fontSize: 12, color: Color(0xFF7A6458), height: 1.35)),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF4E8), // Soft warm cream
      appBar: AppBar(
        backgroundColor: const Color(0xFFFBF4E8),
        elevation: 0,
        centerTitle: false,
        automaticallyImplyLeading: false,
        leading: Navigator.canPop(context)
            ? Center(
                child: Container(
                  margin: const EdgeInsets.only(left: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, 2))
                    ],
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new, size: 16, color: Color(0xFF5C4033)),
                    onPressed: () => Navigator.pop(context),
                  ),
                ),
              )
            : null,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'My Pets 🐾',
              style: TextStyle(
                color: Color(0xFF5C4033),
                fontWeight: FontWeight.bold,
                fontSize: 22,
              ),
            ),
            SizedBox(height: 2),
            Text(
              'Digital ID & verified health records',
              style: TextStyle(
                color: Color(0xFF7A6458),
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, 2))
              ],
            ),
            child: IconButton(
              icon: const Icon(Icons.refresh, size: 20, color: Color(0xFF8B5A2B)),
              onPressed: _reload,
              tooltip: 'Refresh',
            ),
          ),
        ],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _petsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(color: Color(0xFF8B5A2B)),
                  SizedBox(height: 16),
                  Text('Loading registered pets...', style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }

          if (snapshot.hasError) {
            final is401 = snapshot.error.toString().contains('401');
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      is401 ? Icons.lock_clock_outlined : Icons.error_outline,
                      size: 56,
                      color: const Color(0xFF8B5A2B),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      is401 ? 'Session Expired' : 'Could not load pets',
                      style: const TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      is401 ? 'Please log in again to view your registered pets.' : '${snapshot.error}',
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                    ),
                    const SizedBox(height: 20),
                    ElevatedButton.icon(
                      onPressed: is401
                          ? () async {
                              await AuthService().logout();
                              if (context.mounted) {
                                Navigator.pushAndRemoveUntil(
                                  context,
                                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                                  (route) => false,
                                );
                              }
                            }
                          : _reload,
                      icon: Icon(is401 ? Icons.login : Icons.refresh),
                      label: Text(is401 ? 'Log In Again' : 'Try Again'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF8B5A2B),
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          // Educational Registration Roadmap Empty State
          if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(22.0),
              physics: const BouncingScrollPhysics(),
              child: Column(
                children: [
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFDEC49B).withAlpha(60),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.pets, size: 56, color: Color(0xFF8B5A2B)),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    "No Registered Pets Yet",
                    style: TextStyle(fontSize: 21, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    "Official pet registration ensures verified rabies vaccination records and issues your pet's life-saving digital QR tag.",
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: Color(0xFF7A6458), height: 1.4),
                  ),
                  const SizedBox(height: 24),

                  // 3-Step Registration Roadmap Card
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFDEC49B)),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 3))
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          "How Pet Registration Works:",
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF5C4033)),
                        ),
                        const SizedBox(height: 14),
                        _buildRoadmapStep(
                          "1",
                          "Veterinarian Visit",
                          "Visit an authorized municipal veterinarian or registered clinic.",
                        ),
                        const SizedBox(height: 10),
                        _buildRoadmapStep(
                          "2",
                          "Verification & Tagging",
                          "Doctor verifies rabies vaccines and enters official microchip records.",
                        ),
                        const SizedBox(height: 10),
                        _buildRoadmapStep(
                          "3",
                          "Digital Passport Sync",
                          "Your pet's profile and downloadable QR tag automatically sync to this screen!",
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _showRegistrationRoadmapModal,
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            side: const BorderSide(color: Color(0xFF8B5A2B), width: 1.8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: const Text("Read Details", style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF8B5A2B))),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _reload,
                          icon: const Icon(Icons.refresh, size: 18),
                          label: const Text("Refresh List", style: TextStyle(fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF5C4033),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 13),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }

          // Active Registered Pets: Digital Passport Cards
          final pets = snapshot.data!;
          return ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
            physics: const BouncingScrollPhysics(),
            itemCount: pets.length,
            itemBuilder: (context, index) {
              final pet = pets[index] as Map<String, dynamic>;
              return _buildDigitalPassportCard(pet);
            },
          );
        },
      ),
    );
  }

  // Modern Digital Pet Passport Card
  Widget _buildDigitalPassportCard(Map<String, dynamic> pet) {
    final String name = pet['petName'] ?? 'Unknown Pet';
    final String rawBreed = pet['breed'] ?? 'Unknown';
    final String breed = rawBreed == 'Other' ? (pet['breedOther'] ?? 'Other') : rawBreed;
    final int ageY = (pet['age'] is Map) ? ((pet['age']['years'] ?? 0) as num).toInt() : 0;
    final String gender = pet['gender'] ?? 'Unknown';
    final String color = pet['color'] ?? '';
    final String? imagePath = _resolveImage(pet);
    final String petId = pet['_id']?.toString() ?? 'VERIFIED';
    final String tagId = petId.length > 6 ? petId.substring(petId.length - 6).toUpperCase() : petId;

    ImageProvider imageProvider;
    if (imagePath != null && imagePath.startsWith('http')) {
      imageProvider = NetworkImage(imagePath);
    } else if (imagePath != null && imagePath.startsWith('data:image')) {
      try {
        final base64String = imagePath.split(',').last.replaceAll(RegExp(r'\s+'), '');
        imageProvider = MemoryImage(dart_convert.base64Decode(base64String));
      } catch (_) {
        imageProvider = const AssetImage('assets/images/dashboard_cat.png');
      }
    } else {
      imageProvider = const AssetImage('assets/images/dashboard_cat.png');
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: const Color(0xFFDEC49B), width: 1.3),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Passport Header: Pet Info & Health Badge
          InkWell(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => PetDetailsScreen(pet: pet)),
              ).then((_) => _reload());
            },
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(16),
                    child: Image(
                      image: imageProvider,
                      width: 82,
                      height: 82,
                      fit: BoxFit.cover,
                      errorBuilder: (_, __, ___) => Container(
                        width: 82,
                        height: 82,
                        color: const Color(0xFFF9EED9),
                        child: const Icon(Icons.pets, size: 36, color: Color(0xFF8B5A2B)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                name,
                                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE8F5E9),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFF2E7D32)),
                              ),
                              child: const Text(
                                "🟢 Verified",
                                style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF2E7D32)),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text("$breed • $gender", style: const TextStyle(fontSize: 13, color: Color(0xFF8B5A2B), fontWeight: FontWeight.w600)),
                        const SizedBox(height: 2),
                        Text("$ageY Years old • $color", style: const TextStyle(fontSize: 12, color: Color(0xFF7A6458))),
                        const SizedBox(height: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF9EED9),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            "TAG: #LK-PET-$tagId",
                            style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF5C4033), letterSpacing: 0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Divider(height: 1, color: Color(0xFFF0EAE1)),

          // 3 Direct Quick Action Buttons on Each Pet Card
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 6.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                // 1. Show QR Tag Button
                TextButton.icon(
                  onPressed: () => _showQrDialog(pet),
                  icon: const Icon(Icons.qr_code, size: 17, color: Color(0xFF8B5A2B)),
                  label: const Text(
                    "QR Tag",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                  ),
                ),

                // 2. Vaccines Shortcut
                TextButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const VaccinationScreen())),
                  icon: const Icon(Icons.vaccines, size: 17, color: Color(0xFF8B5A2B)),
                  label: const Text(
                    "Vaccines",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                  ),
                ),

                // 3. Mark as Lost (Pre-filled safety trigger)
                TextButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ReportLostScreen(
                          initialPetName: name,
                          initialBreed: breed,
                          initialColor: color,
                          initialImageUrl: imagePath,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.search, size: 17, color: Color(0xFF8B2500)),
                  label: const Text(
                    "Mark Lost",
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF8B2500)),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
