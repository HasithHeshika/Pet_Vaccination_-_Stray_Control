import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../models/community_listing.dart';
import '../services/community_listing_service.dart';
import 'listing_form_screen.dart';

class BreedingMatchScreen extends StatefulWidget {
  const BreedingMatchScreen({super.key});

  @override
  State<BreedingMatchScreen> createState() => _BreedingMatchScreenState();
}

class _BreedingMatchScreenState extends State<BreedingMatchScreen> {
  final CommunityListingService _service = CommunityListingService();
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  List<CommunityListing> _listings = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadListings();
  }

  Future<void> _loadListings() async {
    setState(() => _isLoading = true);
    final results = await _service.getListings(category: 'Breeding Match');
    if (mounted) {
      setState(() {
        _listings = results;
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<CommunityListing> get _filteredListings {
    final all = _listings.where((item) => item.category == 'Breeding Match').toList();
    if (_searchQuery.trim().isEmpty) return all;
    final query = _searchQuery.toLowerCase();
    return all.where((item) {
      final matchName = item.petName.toLowerCase().contains(query);
      final matchBreed = item.breed.toLowerCase().contains(query);
      final matchCity = item.city.toLowerCase().contains(query);
      return matchName || matchBreed || matchCity;
    }).toList();
  }

  void _openListForm() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ListingFormScreen()),
    );
    if (result == true) {
      _loadListings();
    }
  }

  @override
  Widget build(BuildContext context) {
    final listings = _filteredListings;

    return Scaffold(
      backgroundColor: const Color(0xFFFBF4E8), // Soft warm cream
      body: SafeArea(
        child: Column(
          children: [
            // Header Bar with responsive constraint fixes
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
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
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Breeding Match 🧬",
                              style: TextStyle(fontSize: 19, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            SizedBox(height: 2),
                            Text(
                              "Verified lineage & stud matchmaking",
                              style: TextStyle(fontSize: 11.5, color: Color(0xFF7A6458)),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        onPressed: _openListForm,
                        icon: const Icon(Icons.add, size: 15),
                        label: const Text("Post", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF5C4033),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 12),

                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFDEC49B)),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (val) => setState(() => _searchQuery = val.trim()),
                      decoration: InputDecoration(
                        hintText: "Search breed, lineage, or city...",
                        hintStyle: TextStyle(color: const Color(0xFF5C4033).withOpacity(0.4), fontSize: 13),
                        prefixIcon: const Icon(Icons.search, color: Color(0xFF8B5A2B), size: 19),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 16, color: Colors.grey),
                                onPressed: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                              )
                            : null,
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Breeding Listings
            Expanded(
              child: _isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: Color(0xFF6A1B9A)),
                    )
                  : RefreshIndicator(
                      color: const Color(0xFF6A1B9A),
                      onRefresh: _loadListings,
                      child: listings.isEmpty
                          ? ListView(
                              children: const [
                                SizedBox(height: 80),
                                Center(child: Text("🧬", style: TextStyle(fontSize: 44))),
                                SizedBox(height: 12),
                                Center(
                                  child: Text(
                                    "No breeding match listings found",
                                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                                  ),
                                ),
                                SizedBox(height: 4),
                                Center(
                                  child: Text("Pull down to refresh or tap 'Post' to list.", style: TextStyle(fontSize: 12, color: Colors.grey)),
                                ),
                              ],
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 6, 16, 24),
                              physics: const AlwaysScrollableScrollPhysics(parent: BouncingScrollPhysics()),
                              itemCount: listings.length,
                              itemBuilder: (context, idx) => _buildBreedingCard(listings[idx]),
                            ),
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBreedingCard(CommunityListing pet) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDEC49B), width: 1.2),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 3)),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _showPetDetailsSheet(pet),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              child: Container(
                height: 170,
                width: double.infinity,
                color: pet.pastelColor,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _buildPetImage(pet),
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF6A1B9A),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          "BREEDING MATCH",
                          style: TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    if (pet.isHealthVerified)
                      Positioned(
                        top: 10,
                        right: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.92),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.workspace_premium, size: 12, color: Color(0xFF5C4033)),
                              SizedBox(width: 4),
                              Text("Pedigree Certified", style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(14.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          pet.petName,
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text("${pet.gender} • ${pet.age}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF8B5A2B))),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(pet.breed, style: TextStyle(fontSize: 12.5, color: const Color(0xFF5C4033).withOpacity(0.7))),
                  const SizedBox(height: 8),

                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: pet.tags.map((t) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9EED9),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFDEC49B)),
                        ),
                        child: Text(t, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF8B5A2B))),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 10),
                  const Divider(height: 1, color: Color(0xFFF0EAE1)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            const Icon(Icons.location_on, size: 13, color: Color(0xFF8B5A2B)),
                            const SizedBox(width: 4),
                            Expanded(
                              child: Text(
                                pet.city,
                                style: const TextStyle(fontSize: 11.5, color: Color(0xFF7A6458)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      const Text("View Pedigree →", style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF8B5A2B))),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPetImage(CommunityListing pet) {
    if (pet.localImageFile != null) {
      return Image.file(pet.localImageFile!, fit: BoxFit.cover);
    } else if (pet.originalPhotoUrl != null && pet.originalPhotoUrl!.isNotEmpty) {
      if (pet.originalPhotoUrl!.startsWith('assets/')) {
        return Image.asset(pet.originalPhotoUrl!, fit: BoxFit.cover);
      } else if (pet.originalPhotoUrl!.startsWith('http')) {
        return Image.network(
          pet.originalPhotoUrl!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildPlaceholder(pet),
        );
      }
    }
    return _buildPlaceholder(pet);
  }

  Widget _buildPlaceholder(CommunityListing pet) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(pet.emoji, style: const TextStyle(fontSize: 48)),
          const SizedBox(height: 4),
          Text(pet.breed, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primaryBrown.withOpacity(0.7))),
        ],
      ),
    );
  }

  void _showPetDetailsSheet(CommunityListing pet) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.88,
        maxChildSize: 0.95,
        minChildSize: 0.5,
        builder: (context, scrollController) {
          return Container(
            decoration: const BoxDecoration(
              color: Color(0xFFFDFBF7),
              borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            ),
            child: Column(
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  width: 44,
                  height: 5,
                  decoration: BoxDecoration(color: Colors.grey.shade400, borderRadius: BorderRadius.circular(10)),
                ),
                Expanded(
                  child: ListView(
                    controller: scrollController,
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          height: 200,
                          color: pet.pastelColor,
                          child: _buildPetImage(pet),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(pet.petName, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                      const SizedBox(height: 4),
                      Text("${pet.breed} • ${pet.gender} • ${pet.age}", style: const TextStyle(fontSize: 13.5, color: Color(0xFF7A6458))),
                      const SizedBox(height: 14),
                      const Text("Lineage & Pedigree", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                      const SizedBox(height: 6),
                      Text(pet.description, style: const TextStyle(fontSize: 13, height: 1.4, color: Color(0xFF6B4E3D))),
                      const SizedBox(height: 16),
                      const Text("Verified Health Clearances", style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                      const SizedBox(height: 8),
                      ...pet.healthRecords.map((h) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.check_circle, color: Color(0xFF2E7D32), size: 20),
                            title: Text(h.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            subtitle: Text("${h.clinic} • ${h.date}", style: const TextStyle(fontSize: 11)),
                          )),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        height: 48,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: pet.ownerPhone));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text("Phone ${pet.ownerPhone} copied to clipboard!")),
                            );
                          },
                          icon: const Icon(Icons.phone, size: 18),
                          label: Text("Contact Breeder (${pet.ownerName})", style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF5C4033),
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                        ),
                      )
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
