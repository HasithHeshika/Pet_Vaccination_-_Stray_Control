import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';
import '../models/community_listing.dart';
import '../services/adoption_service.dart';
import '../services/auth_service.dart';
import 'listing_form_screen.dart';

class AdoptionScreen extends StatefulWidget {
  const AdoptionScreen({super.key});

  @override
  State<AdoptionScreen> createState() => _AdoptionScreenState();
}

class _AdoptionScreenState extends State<AdoptionScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final AdoptionService _service = AdoptionService();

  // Browse state
  String _selectedFilter = 'All'; // All, Free Adoption, Dogs, Cats
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
    final results = await _service.getAdoptionListings();
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
      if (_selectedFilter == 'Free Adoption' && !item.isFree) return false;
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
        builder: (_) => const ListingFormScreen(initialCategory: 'Adoption'),
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
                              "Find & Adopt a Pet",
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF5C4033),
                              ),
                            ),
                            Text(
                              "Verified rescues & home rehoming",
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
                          "List a Pet",
                          style: TextStyle(
                              fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8B5A2B),
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
                        color: const Color(0xFF8B5A2B),
                        borderRadius: BorderRadius.circular(22),
                      ),
                      indicatorSize: TabBarIndicatorSize.tab,
                      labelColor: Colors.white,
                      unselectedLabelColor: const Color(0xFF5C4033),
                      labelStyle: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 13),
                      tabs: const [
                        Tab(text: "Browse Pets"),
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
              // Search Input
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
                    hintText: "Search by pet name, breed, or city...",
                    hintStyle:
                        TextStyle(fontSize: 13, color: Colors.grey.shade400),
                    prefixIcon: const Icon(Icons.search,
                        color: Color(0xFF8B5A2B), size: 20),
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
                    _buildFilterChip('Free Adoption'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Dogs'),
                    const SizedBox(width: 8),
                    _buildFilterChip('Cats'),
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
                  child: CircularProgressIndicator(
                    color: Color(0xFF8B5A2B),
                  ),
                )
              : RefreshIndicator(
                  color: const Color(0xFF8B5A2B),
                  onRefresh: _loadListings,
                  child: listings.isEmpty
                      ? ListView(
                          children: const [
                            SizedBox(height: 80),
                            Center(
                                child:
                                    Text("🐾", style: TextStyle(fontSize: 48))),
                            SizedBox(height: 12),
                            Center(
                              child: Text(
                                "No pets found matching this filter",
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
                                "Pull down to refresh or try listing a pet!",
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
                              _buildAdoptionCard(listings[idx]),
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
          color: isSelected ? const Color(0xFF8B5A2B) : Colors.white,
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

  Widget _buildAdoptionCard(CommunityListing pet) {
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
                    if (pet.isFree)
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF2E7D32),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            "FREE ADOPTION",
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
                                "Health Verified",
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
                            color: Color(0xFF8B5A2B),
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
                        "View Profile →",
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF8B5A2B),
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
                "Log in to manage and update your listed adoption pets.",
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Colors.grey),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: _checkAuthAndLoad,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B5A2B),
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
        child: CircularProgressIndicator(color: Color(0xFF8B5A2B)),
      );
    }

    return RefreshIndicator(
      color: const Color(0xFF8B5A2B),
      onRefresh: _loadMyListings,
      child: _myListings.isEmpty
          ? ListView(
              children: [
                const SizedBox(height: 80),
                const Center(child: Text("📋", style: TextStyle(fontSize: 48))),
                const SizedBox(height: 12),
                const Center(
                  child: Text(
                    "You haven't listed any pets for adoption yet",
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
                    label: const Text("Create an Adoption Listing"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B5A2B),
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
      case 'Available':
        statusColor = const Color(0xFF2E7D32); // Green
        break;
      case 'Pending':
        statusColor = const Color(0xFFF57C00); // Orange
        break;
      case 'Adopted':
        statusColor = const Color(0xFF1976D2); // Blue
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
                  itemBuilder: (context) => [
                    'Available',
                    'Pending',
                    'Adopted',
                    'Cancelled'
                  ]
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
                            size: 16, color: Color(0xFF8B5A2B)),
                        SizedBox(width: 4),
                        Text(
                          "Update Status",
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF8B5A2B),
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
        title: const Text("Delete Listing?"),
        content: const Text(
            "Are you sure you want to delete this adoption listing? This action cannot be undone."),
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
          Text(pet.emoji, style: const TextStyle(fontSize: 50)),
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
                          height: 220,
                          color: pet.pastelColor,
                          child: _buildPetImage(pet),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        pet.petName,
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF5C4033),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        "${pet.breed} • ${pet.gender} • ${pet.age}",
                        style: const TextStyle(
                            fontSize: 14, color: Color(0xFF7A6458)),
                      ),
                      const SizedBox(height: 14),
                      const Text(
                        "About This Pet",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF5C4033),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        pet.description,
                        style: const TextStyle(
                          fontSize: 13.5,
                          height: 1.4,
                          color: Color(0xFF6B4E3D),
                        ),
                      ),
                      const SizedBox(height: 18),
                      const Text(
                        "Verified Health & Vaccines",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF5C4033),
                        ),
                      ),
                      const SizedBox(height: 8),
                      ...pet.healthRecords.map((h) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const Icon(Icons.check_circle,
                                color: Color(0xFF2E7D32)),
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

                      // Apply for Adoption Button (Primary action)
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(ctx);
                            _showApplyDialog(pet);
                          },
                          icon: const Icon(Icons.favorite, color: Colors.white),
                          label: Text(
                            "Apply to Adopt ${pet.petName}",
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2E7D32),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            elevation: 2,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),

                      // Contact Guardian Button (Secondary action)
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
                                backgroundColor: const Color(0xFF8B5A2B),
                              ),
                            );
                          },
                          icon: const Icon(Icons.phone,
                              size: 18, color: Color(0xFF8B5A2B)),
                          label: Text(
                            "Contact Guardian (${pet.ownerName})",
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF8B5A2B),
                            ),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(
                                color: Color(0xFF8B5A2B), width: 1.2),
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

  // ── Apply Dialog ───────────────────────────────────────────────────────────
  void _showApplyDialog(CommunityListing pet) async {
    final token = await AuthService().getToken();
    if (token == null || token.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Please sign in first to submit an adoption application."),
            backgroundColor: Colors.red,
          ),
        );
      }
      return;
    }

    final messageController = TextEditingController();
    final phoneController = TextEditingController();
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
                const Text("🐾", style: TextStyle(fontSize: 22)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "Adopt ${pet.petName}",
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
                    "Tell the guardian why you would provide a great home for this pet.",
                    style: TextStyle(fontSize: 12.5, color: Color(0xFF7A6458)),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: InputDecoration(
                      labelText: "Your Contact Phone",
                      hintText: "+94 77 123 4567",
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: messageController,
                    maxLines: 4,
                    decoration: InputDecoration(
                      labelText: "Application Message",
                      hintText:
                          "I have a secure garden, previous pet experience, and would love to welcome ${pet.petName} into my family...",
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
                                  Text("Please provide your contact phone."),
                              backgroundColor: Colors.red,
                            ),
                          );
                          return;
                        }

                        setDlgState(() => isSubmitting = true);
                        try {
                          await _service.applyForAdoption(
                            pet.id,
                            {
                              'message': messageController.text.trim(),
                              'contactPhone': phoneController.text.trim(),
                            },
                            token,
                          );

                          if (mounted) {
                            Navigator.pop(dlgCtx);
                            ScaffoldMessenger.of(this.context).showSnackBar(
                              SnackBar(
                                content: Text(
                                    "🎉 Application submitted for ${pet.petName}!"),
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
                  backgroundColor: const Color(0xFF2E7D32),
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
                    : const Text("Submit Application"),
              ),
            ],
          );
        },
      ),
    );
  }
}
