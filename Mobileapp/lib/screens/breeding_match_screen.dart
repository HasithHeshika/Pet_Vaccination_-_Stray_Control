import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/app_theme.dart';
import '../models/community_listing.dart';
import '../services/breeding_service.dart';
import '../services/auth_service.dart';
import 'listing_form_screen.dart';

class BreedingMatchScreen extends StatefulWidget {
  const BreedingMatchScreen({super.key});

  @override
  State<BreedingMatchScreen> createState() => _BreedingMatchScreenState();
}

class _BreedingMatchScreenState extends State<BreedingMatchScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final BreedingService _service = BreedingService();

  // Find Matches state
  String _selectedFilter = 'All'; // All, Dogs, Cats, Licensed
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  List<CommunityListing> _listings = [];
  bool _isLoading = true;

  // My Listings state
  List<CommunityListing> _myListings = [];
  bool _isLoadingMyListings = false;
  bool _isLoggedIn = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(_handleTabSelection);
    _checkAuthAndLoad();
  }

  void _handleTabSelection() {
    if (_tabController.index == 1 && !_tabController.indexIsChanging) {
      _loadMyListings();
    }
  }

  Future<void> _checkAuthAndLoad() async {
    final token = await AuthService().getToken();
    if (mounted) {
      setState(() => _isLoggedIn = token != null && token.isNotEmpty);
    }
    _loadListings();
    if (_isLoggedIn) {
      _loadMyListings();
    }
  }

  Future<void> _loadListings() async {
    setState(() => _isLoading = true);
    final results = await _service.getBreedingListings();
    if (mounted) {
      setState(() {
        _listings = results;
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMyListings() async {
    final token = await AuthService().getToken();
    if (token == null || token.isEmpty) {
      if (mounted) setState(() => _isLoggedIn = false);
      return;
    }
    setState(() {
      _isLoggedIn = true;
      _isLoadingMyListings = true;
    });

    final results = await _service.getMyListings(token);
    if (mounted) {
      setState(() {
        _myListings = results;
        _isLoadingMyListings = false;
      });
    }
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabSelection);
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  List<CommunityListing> get _filteredListings {
    return _listings.where((item) {
      if (_selectedFilter == 'Dogs' &&
          !item.breed.toLowerCase().contains('dog') &&
          !item.tags.any((t) => t.toLowerCase().contains('dog'))) {
        return false;
      }
      if (_selectedFilter == 'Cats' &&
          !item.breed.toLowerCase().contains('cat') &&
          !item.tags.any((t) => t.toLowerCase().contains('cat'))) {
        return false;
      }
      if (_selectedFilter == 'Licensed' &&
          !item.tags.any((t) => t.toLowerCase().contains('licensed'))) {
        return false;
      }

      if (_searchQuery.trim().isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchName = item.petName.toLowerCase().contains(query);
        final matchBreed = item.breed.toLowerCase().contains(query);
        final matchCity = item.city.toLowerCase().contains(query);
        return matchName || matchBreed || matchCity;
      }
      return true;
    }).toList();
  }

  void _openListForm() async {
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const ListingFormScreen(initialCategory: 'Breeding Match'),
      ),
    );
    if (result == true) {
      _loadListings();
      if (_isLoggedIn) _loadMyListings();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF4E8), // Soft warm cream
      body: SafeArea(
        child: Column(
          children: [
            // Header Bar
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
                            BoxShadow(
                              color: Colors.black.withOpacity(0.06),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            )
                          ],
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.arrow_back_ios_new,
                              size: 16, color: Color(0xFF5C4033)),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              "Breeder Matching",
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF5C4033),
                              ),
                            ),
                            Text(
                              "Ethical studs & licensed breeders",
                              style: TextStyle(
                                  fontSize: 12, color: Color(0xFF8B5A2B)),
                            ),
                          ],
                        ),
                      ),
                      ElevatedButton.icon(
                        onPressed: _openListForm,
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text(
                          "Post Stud",
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF5C4033),
                          foregroundColor: Colors.white,
                          elevation: 1,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 8),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Tabs
                  Container(
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(
                          color: const Color(0xFFDEC49B), width: 1.2),
                    ),
                    child: TabBar(
                      controller: _tabController,
                      indicator: BoxDecoration(
                        color: const Color(0xFF5C4033),
                        borderRadius: BorderRadius.circular(22),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      labelColor: Colors.white,
                      unselectedLabelColor: const Color(0xFF5C4033),
                      labelStyle: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13),
                      tabs: const [
                        Tab(text: "Find Matches"),
                        Tab(text: "My Listings"),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Tab Bar View
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildBrowseTab(),
                  _buildMyListingsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Browse Tab ─────────────────────────────────────────────────────────────
  Widget _buildBrowseTab() {
    final listings = _filteredListings;

    return Column(
      children: [
        // Search & Filter Section
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 6.0),
          child: Column(
            children: [
              // Search Bar
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border:
                      Border.all(color: const Color(0xFFDEC49B), width: 1.2),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.03),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _searchController,
                  onChanged: (val) => setState(() => _searchQuery = val),
                  decoration: InputDecoration(
                    hintText: "Search stud name, breed, or location...",
                    hintStyle:
                        TextStyle(fontSize: 13, color: Colors.grey.shade400),
                    prefixIcon: const Icon(Icons.search,
                        color: Color(0xFF5C4033), size: 20),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear,
                                size: 18, color: Colors.grey),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _searchQuery = '');
                            },
                          )
                        : null,
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                ),
              ),
              const SizedBox(height: 8),

              // Filter Chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Row(
                  children: [
                    _buildFilterChip('All'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Dogs'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Cats'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Licensed'),
                  ],
                ),
              ),
            ],
          ),
        ),

        // Listings List
        Expanded(
          child: _isLoading
              ? const Center(
                  child: CircularProgressIndicator(color: Color(0xFF5C4033)),
                )
              : RefreshIndicator(
                  color: const Color(0xFF5C4033),
                  onRefresh: _loadListings,
                  child: listings.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 80),
                            Center(
                                child:
                                    Text("🧬", style: TextStyle(fontSize: 48))),
                            SizedBox(height: 12),
                            Center(
                              child: Text(
                                "No breeding matches found",
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF5C4033),
                                ),
                              ),
                            ),
                            SizedBox(height: 6),
                            Center(
                              child: Text(
                                "Pull down to refresh or post your stud listing!",
                                style: TextStyle(
                                    fontSize: 12, color: Colors.grey),
                              ),
                            ),
                          ],
                        )
                      : ListView.builder(
                          padding:
                              const EdgeInsets.fromLTRB(16, 8, 16, 24),
                          physics: const AlwaysScrollableScrollPhysics(
                              parent: BouncingScrollPhysics()),
                          itemCount: listings.length,
                          itemBuilder: (context, idx) =>
                              _buildBreedingCard(listings[idx]),
                        ),
                ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String label) {
    final isSelected = _selectedFilter == label;
    return GestureDetector(
      onTap: () => setState(() => _selectedFilter = label),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF5C4033) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFDEC49B)),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : const Color(0xFF5C4033),
          ),
        ),
      ),
    );
  }

  Widget _buildBreedingCard(CommunityListing pet) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFDEC49B), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => _showPetDetailsSheet(pet),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(20)),
              child: Container(
                height: 180,
                width: double.infinity,
                color: pet.pastelColor,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _buildPetImage(pet),
                    Positioned(
                      top: 12,
                      left: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFF5C4033),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          "STUD / BREEDER",
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                    if (pet.isHealthVerified)
                      Positioned(
                        top: 12,
                        right: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.92),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.verified,
                                  size: 12, color: Color(0xFF2E7D32)),
                              SizedBox(width: 4),
                              Text(
                                "Health Tested",
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF2E7D32),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          pet.petName,
                          style: const TextStyle(
                            fontSize: 19,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF5C4033),
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        "${pet.gender} • ${pet.age}",
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF8B5A2B),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    pet.breed,
                    style: TextStyle(
                      fontSize: 13,
                      color: const Color(0xFF5C4033).withOpacity(0.7),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 6,
                    children: pet.tags.map((t) {
                      return Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF9EED9),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFDEC49B)),
                        ),
                        child: Text(
                          t,
                          style: const TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF5C4033),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFF0EAE1)),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.location_on,
                              size: 13, color: Color(0xFF8B5A2B)),
                          const SizedBox(width: 4),
                          Text(pet.city,
                              style: const TextStyle(
                                  fontSize: 11.5, color: Color(0xFF7A6458))),
                        ],
                      ),
                      const Text(
                        "View Lineage →",
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF5C4033),
                        ),
                      ),
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

  // ── My Listings Tab ────────────────────────────────────────────────────────
  Widget _buildMyListingsTab() {
    if (!_isLoggedIn) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text("🔐", style: TextStyle(fontSize: 48)),
              const SizedBox(height: 16),
              const Text(
                "Sign In Required",
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF5C4033),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                "Log in to manage and update your listed breeding matches.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _checkAuthAndLoad,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5C4033),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text("Refresh Status"),
              ),
            ],
          ),
        ),
      );
    }

    if (_isLoadingMyListings) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF5C4033)),
      );
    }

    return RefreshIndicator(
      color: const Color(0xFF5C4033),
      onRefresh: _loadMyListings,
      child: _myListings.isEmpty
          ? ListView(
              children: [
                const SizedBox(height: 80),
                const Center(child: Text("🧬", style: TextStyle(fontSize: 48))),
                const SizedBox(height: 12),
                const Center(
                  child: Text(
                    "You haven't posted any breeding listings yet",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF5C4033),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: ElevatedButton.icon(
                    onPressed: _openListForm,
                    icon: const Icon(Icons.add),
                    label: const Text("Post a Stud / Breeding Listing"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5C4033),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                ),
              ],
            )
          : ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              physics: const AlwaysScrollableScrollPhysics(
                  parent: BouncingScrollPhysics()),
              itemCount: _myListings.length,
              itemBuilder: (context, idx) =>
                  _buildMyListingCard(_myListings[idx]),
            ),
    );
  }

  Widget _buildMyListingCard(CommunityListing listing) {
    Color statusColor;
    switch (listing.listingStatus) {
      case 'Active':
        statusColor = const Color(0xFF2E7D32); // Green
        break;
      case 'Mated':
        statusColor = const Color(0xFF1976D2); // Blue
        break;
      case 'Paused':
        statusColor = const Color(0xFFF57C00); // Orange
        break;
      default:
        statusColor = Colors.grey;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFDEC49B), width: 1.2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 54,
                    height: 54,
                    color: listing.pastelColor,
                    child: _buildPetImage(listing),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        listing.petName,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF5C4033),
                        ),
                      ),
                      Text(
                        "${listing.breed} • ${listing.gender}",
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade700),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor, width: 1),
                  ),
                  child: Text(
                    listing.listingStatus,
                    style: TextStyle(
                      color: statusColor,
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            const Divider(height: 1, color: Color(0xFFF0EAE1)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                // Change status dropdown button
                PopupMenuButton<String>(
                  onSelected: (newStatus) =>
                      _changeStatus(listing.id, newStatus),
                  itemBuilder: (context) => ['Active', 'Mated', 'Paused']
                      .map((st) => PopupMenuItem(
                            value: st,
                            child: Text(st),
                          ))
                      .toList(),
                  child: Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF9EED9),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFDEC49B)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.edit_note,
                            size: 16, color: Color(0xFF5C4033)),
                        SizedBox(width: 4),
                        Text(
                          "Update Status",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF5C4033),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Delete button
                IconButton(
                  icon: const Icon(Icons.delete_outline,
                      color: Colors.redAccent, size: 20),
                  onPressed: () => _confirmDeleteListing(listing.id),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _changeStatus(String listingId, String newStatus) async {
    final token = await AuthService().getToken();
    if (token == null) return;

    try {
      await _service.updateStatus(listingId, newStatus, token);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Listing status updated to $newStatus"),
          backgroundColor: const Color(0xFF2E7D32),
        ),
      );
      _loadMyListings();
      _loadListings();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text("Failed to update status: $e"),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _confirmDeleteListing(String listingId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text("Delete Breeding Listing?"),
        content: const Text(
            "Are you sure you want to delete this listing? This action cannot be undone."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text("Cancel"),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text("Delete", style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      final token = await AuthService().getToken();
      if (token == null) return;
      try {
        await _service.deleteListing(listingId, token);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Listing deleted successfully"),
            backgroundColor: Color(0xFF2E7D32),
          ),
        );
        _loadMyListings();
        _loadListings();
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text("Failed to delete listing: $e"),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildPetImage(CommunityListing pet) {
    if (pet.localImageFile != null) {
      return Image.file(pet.localImageFile!, fit: BoxFit.cover);
    } else if (pet.originalPhotoUrl != null &&
        pet.originalPhotoUrl!.isNotEmpty) {
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
          Text(
            pet.breed,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: AppTheme.primaryBrown.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }

  // ── Details Sheet ──────────────────────────────────────────────────────────
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
                  decoration: BoxDecoration(
                    color: Colors.grey.shade400,
                    borderRadius: BorderRadius.circular(10),
                  ),
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
                      Text(
                        pet.petName,
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF5C4033),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "${pet.breed} • ${pet.gender} • ${pet.age}",
                        style: const TextStyle(
                            fontSize: 13.5, color: Color(0xFF7A6458)),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        "Lineage & Pedigree",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF5C4033),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        pet.description,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.4,
                          color: Color(0xFF6B4E3D),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        "Verified Health Clearances",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF5C4033),
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...pet.healthRecords.map((h) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.check_circle,
                                color: Color(0xFF2E7D32), size: 20),
                            title: Text(
                              h.title,
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            subtitle: Text(
                              "${h.clinic} • ${h.date}",
                              style: const TextStyle(fontSize: 11),
                            ),
                          )),
                      const SizedBox(height: 24),

                      // Primary button: Send Breeding Inquiry
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(ctx);
                            _showBreedingInquiryDialog(pet);
                          },
                          icon: const Icon(Icons.send_rounded,
                              color: Colors.white, size: 18),
                          label: Text(
                            "Send Inquiry for ${pet.petName}",
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF5C4033),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Secondary button: Contact Breeder (phone copy)
                      SizedBox(
                        width: double.infinity,
                        height: 46,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(
                                ClipboardData(text: pet.ownerPhone));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                    "Phone ${pet.ownerPhone} copied to clipboard!"),
                                backgroundColor: const Color(0xFF5C4033),
                              ),
                            );
                          },
                          icon: const Icon(Icons.phone,
                              size: 18, color: Color(0xFF5C4033)),
                          label: Text(
                            "Contact Breeder (${pet.ownerName})",
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF5C4033),
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(
                                color: Color(0xFF5C4033), width: 1.2),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                      ),
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

  // ── Inquiry Dialog ─────────────────────────────────────────────────────────
  void _showBreedingInquiryDialog(CommunityListing pet) async {
    final token = await AuthService().getToken();
    if (token == null || token.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Please sign in first to contact this breeder."),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    final petNameController = TextEditingController();
    final petBreedController = TextEditingController();
    final phoneController = TextEditingController();
    final messageController = TextEditingController();
    bool isSubmitting = false;

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (dlgCtx) => StatefulBuilder(
        builder: (context, setDlgState) {
          return AlertDialog(
            shape:
                RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                const Text("🧬", style: TextStyle(fontSize: 22)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "Match with ${pet.petName}",
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF5C4033),
                    ),
                  ),
                ),
              ],
            ),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Provide your pet details and terms to contact the stud owner.",
                    style: TextStyle(fontSize: 12.5, color: Color(0xFF7A6458)),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: petNameController,
                    decoration: InputDecoration(
                      labelText: "Your Pet's Name",
                      hintText: "e.g. Luna",
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: petBreedController,
                    decoration: InputDecoration(
                      labelText: "Your Pet's Breed",
                      hintText: "e.g. Golden Retriever",
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: "Contact Phone",
                      hintText: "+94 77 123 4567",
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: messageController,
                    maxLines: 3,
                    decoration: InputDecoration(
                      labelText: "Message / Match Terms",
                      hintText:
                          "Details on cycle dates, pedigree certifications...",
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.all(12),
                    ),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed:
                    isSubmitting ? null : () => Navigator.pop(dlgCtx),
                child: const Text("Cancel"),
              ),
              ElevatedButton(
                onPressed: isSubmitting
                    ? null
                    : () async {
                        if (phoneController.text.trim().isEmpty) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content:
                                  Text("Please enter your contact phone."),
                              backgroundColor: Colors.red,
                            ),
                          );
                          return;
                        }

                        setDlgState(() => isSubmitting = true);
                        try {
                          await _service.contactBreeder(
                            pet.id,
                            {
                              'petName': petNameController.text.trim(),
                              'petBreed': petBreedController.text.trim(),
                              'contactPhone': phoneController.text.trim(),
                              'message': messageController.text.trim(),
                            },
                            token,
                          );

                          if (mounted) {
                            Navigator.pop(dlgCtx);
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(
                                content: Text(
                                    "🎉 Inquiry sent to ${pet.ownerName}!"),
                                backgroundColor: const Color(0xFF2E7D32),
                              ),
                            );
                          }
                        } catch (e) {
                          setDlgState(() => isSubmitting = false);
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                  "Failed: ${e.toString().replaceAll("Exception: ", "")}"),
                              backgroundColor: Colors.red,
                            ),
                          );
                        }
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF5C4033),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: isSubmitting
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(
                          color: Colors.white,
                          strokeWidth: 2,
                        ),
                      )
                    : const Text("Send Inquiry"),
              ),
            ],
          );
        },
      ),
    );
  }
}
