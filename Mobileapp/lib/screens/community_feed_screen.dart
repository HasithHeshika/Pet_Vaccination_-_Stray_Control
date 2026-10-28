import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/community_incident.dart';
import '../services/community_incident_service.dart';
import '../services/lost_and_found_service.dart';
import '../services/auth_service.dart';
import 'report_lost_screen.dart';
import 'report_stray_screen.dart';

class CommunityFeedScreen extends StatefulWidget {
  const CommunityFeedScreen({super.key});

  @override
  State<CommunityFeedScreen> createState() => _CommunityFeedScreenState();
}

class _CommunityFeedScreenState extends State<CommunityFeedScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final CommunityIncidentService _incidentService = CommunityIncidentService();
  final LostAndFoundService _lostService = LostAndFoundService();

  int _currentTabIndex = 0;
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();

  late Future<List<CommunityIncident>> _incidentsFuture;
  late Future<List<dynamic>> _lostPetsFuture;

  @override
  void initState() {
    super.initState();
    // Exactly 2 tabs: Complaints & Incidents, and Lost Pet Advertisements
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (!_tabController.indexIsChanging) {
        setState(() {
          _currentTabIndex = _tabController.index;
          _searchQuery = '';
          _searchController.clear();
        });
      }
    });

    _refreshIncidents();
    _refreshLostPets();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _refreshIncidents() {
    setState(() {
      _incidentsFuture = _incidentService.getIncidents();
    });
  }

  void _refreshLostPets() {
    setState(() {
      _lostPetsFuture = _lostService.getLostAndFoundList();
    });
  }

  void _openCreateMenu() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
        decoration: const BoxDecoration(
          color: Color(0xFFFBF7F0),
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
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(10),
                ),
              ),
            ),
            const Text(
              "Community Broadcast",
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF5C4033),
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              "Publish a public incident report or advertise a missing pet.",
              style: TextStyle(fontSize: 13, color: Color(0xFF7A6458)),
            ),
            const SizedBox(height: 18),

            // 1. Post a Complaint / Incident
            _buildCreateActionTile(
              icon: Icons.campaign,
              iconBg: const Color(0xFF8B5A2B),
              title: "File an Incident / Complaint",
              subtitle: "Aggressive stray, injured pet, noise, or rabies hazards",
              onTap: () {
                Navigator.pop(ctx);
                _openReportIncidentSheet();
              },
            ),
            const SizedBox(height: 10),

            // 2. Report Lost Pet Advertisement
            _buildCreateActionTile(
              icon: Icons.pets,
              iconBg: const Color(0xFF9E6D4E),
              title: "Report Lost Pet Advertisement",
              subtitle: "Publish a high-visibility missing pet alert to neighbors",
              onTap: () async {
                Navigator.pop(ctx);
                final res = await Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportLostScreen()));
                if (res == true) _refreshLostPets();
              },
            ),
            const SizedBox(height: 10),

            // 3. Report Stray Sighting
            _buildCreateActionTile(
              icon: Icons.add_location_alt,
              iconBg: const Color(0xFF5C4033),
              title: "Report Stray Animal to Municipality",
              subtitle: "Alert municipal animal control with description & location",
              onTap: () async {
                Navigator.pop(ctx);
                final res = await Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportStrayScreen()));
                if (res == true) _refreshIncidents();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateActionTile({
    required IconData icon,
    required Color iconBg,
    Color iconColor = Colors.white,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEADBC8)),
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 20,
              backgroundColor: iconBg,
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF5C4033))),
                  const SizedBox(height: 2),
                  Text(subtitle, style: const TextStyle(fontSize: 11.5, color: Color(0xFF7A6458))),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 13, color: Color(0xFF8B5A2B)),
          ],
        ),
      ),
    );
  }

  // --- Modal Form to Post an Incident / Complaint with Photos ---
  void _openReportIncidentSheet() {
    final catController = TextEditingController(text: 'Aggressive Stray Alert');
    final locController = TextEditingController();
    final descController = TextEditingController();
    final imgController = TextEditingController();
    bool isSubmitting = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 24,
          ),
          decoration: const BoxDecoration(
            color: Color(0xFFFDFBF7),
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 44,
                    height: 5,
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: const BoxDecoration(color: Color(0xFFDEC49B), shape: BoxShape.circle),
                      child: const Icon(Icons.campaign, color: Color(0xFF5C4033), size: 22),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        "File Incident or Complaint",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                const Text("Incident Category", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF5C4033))),
                const SizedBox(height: 6),
                DropdownButtonFormField<String>(
                  value: catController.text,
                  items: const [
                    DropdownMenuItem(value: "Aggressive Stray Alert", child: Text("⚠️ Aggressive Stray Alert")),
                    DropdownMenuItem(value: "Injured Animal in Need", child: Text("🩹 Injured Animal in Need")),
                    DropdownMenuItem(value: "Stray Dog Pack", child: Text("🐕 Stray Dog Pack")),
                    DropdownMenuItem(value: "Rabies Suspect & Welfare", child: Text("🚯 Rabies Suspect & Welfare")),
                    DropdownMenuItem(value: "Noise Disturbance", child: Text("🔊 Excessive Barking / Noise")),
                    DropdownMenuItem(value: "Animal Cruelty / Abuse", child: Text("🚨 Animal Cruelty / Abuse")),
                  ],
                  onChanged: (val) {
                    if (val != null) setModalState(() => catController.text = val);
                  },
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                  ),
                ),
                const SizedBox(height: 14),

                const Text("Location / Landmark", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF5C4033))),
                const SizedBox(height: 6),
                TextField(
                  controller: locController,
                  decoration: InputDecoration(
                    hintText: "e.g., Reid Avenue, near Town Hall",
                    filled: true,
                    fillColor: Colors.white,
                    prefixIcon: const Icon(Icons.location_on, color: Color(0xFF8B5A2B), size: 18),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                  ),
                ),
                const SizedBox(height: 14),

                const Text("Incident Photo (URL or Asset)", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF5C4033))),
                const SizedBox(height: 6),
                TextField(
                  controller: imgController,
                  decoration: InputDecoration(
                    hintText: "Paste image URL or leave blank for default photo",
                    filled: true,
                    fillColor: Colors.white,
                    prefixIcon: const Icon(Icons.photo_camera, color: Color(0xFF8B5A2B), size: 18),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                  ),
                ),
                const SizedBox(height: 14),

                const Text("Describe What Happened", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF5C4033))),
                const SizedBox(height: 6),
                TextField(
                  controller: descController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    hintText: "Details about the animal, danger level, direction it went...",
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                  ),
                ),
                const SizedBox(height: 20),

                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            if (locController.text.trim().isEmpty || descController.text.trim().isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text("Location and Description are required.")),
                              );
                              return;
                            }

                            setModalState(() => isSubmitting = true);

                            String userName = "Community Neighbor";
                            final me = await AuthService().getMe();
                            if (me != null && me['fullName'] != null) {
                              userName = me['fullName'];
                            }

                            await _incidentService.reportIncident(
                              authorName: userName,
                              category: catController.text,
                              location: locController.text.trim(),
                              description: descController.text.trim(),
                              photoUrl: imgController.text.trim().isNotEmpty
                                  ? imgController.text.trim()
                                  : 'assets/images/login_dog.png',
                            );

                            if (mounted) {
                              Navigator.pop(ctx);
                              _refreshIncidents();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text("Incident broadcasted to community feed!")),
                              );
                            }
                          },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF8B5A2B),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    child: isSubmitting
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text("Broadcast Incident", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _openCommentsSheet(CommunityIncident incident) {
    final commentController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setCommentsState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    "Comments (${incident.comments.length})",
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                  ),
                  Text(
                    incident.category,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF8B5A2B)),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              Flexible(
                child: incident.comments.isEmpty
                    ? const Padding(
                        padding: EdgeInsets.symmetric(vertical: 24.0),
                        child: Center(
                          child: Text("No comments yet. Be the first neighbor to respond!", style: TextStyle(color: Colors.grey)),
                        ),
                      )
                    : ListView.separated(
                        shrinkWrap: true,
                        itemCount: incident.comments.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, idx) {
                          final c = incident.comments[idx];
                          return Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: const Color(0xFFEADBC8)),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(c.authorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF5C4033))),
                                    Text(c.timestamp, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                  ],
                                ),
                                const SizedBox(height: 4),
                                Text(c.text, style: const TextStyle(fontSize: 13, color: Color(0xFF6B4E3D))),
                              ],
                            ),
                          );
                        },
                      ),
              ),

              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: commentController,
                      decoration: InputDecoration(
                        hintText: "Add your neighbor update...",
                        hintStyle: const TextStyle(fontSize: 13),
                        filled: true,
                        fillColor: Colors.white,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: Color(0xFFDEC49B))),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send_rounded, color: Color(0xFF8B5A2B)),
                    onPressed: () async {
                      if (commentController.text.trim().isEmpty) return;

                      String commenter = "Neighbor";
                      final me = await AuthService().getMe();
                      if (me != null && me['fullName'] != null) {
                        commenter = me['fullName'];
                      }

                      final text = commentController.text.trim();
                      commentController.clear();

                      final newComment = await _incidentService.addComment(incident.id, commenter, text);
                      setCommentsState(() {
                        incident.comments.add(newComment);
                      });
                      _refreshIncidents();
                    },
                  )
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF4E8), // Soft warm cream
      body: SafeArea(
        child: NestedScrollView(
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                                onPressed: () {
                                  if (Navigator.canPop(context)) Navigator.pop(context);
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            const Text(
                              "Community Hub",
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF5C4033),
                              ),
                            ),
                          ],
                        ),
                        Container(
                          decoration: BoxDecoration(
                            color: Colors.white,
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 8, offset: const Offset(0, 2))
                            ],
                          ),
                          child: IconButton(
                            icon: const Icon(Icons.refresh, size: 20, color: Color(0xFF8B5A2B)),
                            onPressed: () {
                              _refreshIncidents();
                              _refreshLostPets();
                              setState(() {});
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    // Search Input
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(18),
                        border: Border.all(color: const Color(0xFFEADBC8)),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 3)),
                        ],
                      ),
                      child: TextField(
                        controller: _searchController,
                        onChanged: (val) => setState(() => _searchQuery = val.trim()),
                        decoration: InputDecoration(
                          hintText: _currentTabIndex == 0
                              ? "Search complaints by area or hazard..."
                              : "Search missing pet name, breed, or city...",
                          hintStyle: TextStyle(color: const Color(0xFF5C4033).withOpacity(0.4), fontSize: 13),
                          prefixIcon: const Icon(Icons.search, color: Color(0xFF8B5A2B), size: 20),
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
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // Top Tab Bar: ONLY 2 Tabs (Complaints & Lost Pets)
            SliverPersistentHeader(
              pinned: true,
              delegate: _CommunityTabsDelegate(
                tabBar: TabBar(
                  controller: _tabController,
                  indicatorColor: const Color(0xFF8B5A2B),
                  indicatorWeight: 3,
                  labelColor: const Color(0xFF5C4033),
                  unselectedLabelColor: Colors.black45,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                  tabs: const [
                    Tab(icon: Icon(Icons.campaign, size: 20), text: "Complaints & Incidents"),
                    Tab(icon: Icon(Icons.pets, size: 20), text: "Lost Pet Advertisements"),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildComplaintsTab(),
              _buildLostFoundTab(),
            ],
          ),
        ),
      ),

      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreateMenu,
        backgroundColor: const Color(0xFF5C4033),
        foregroundColor: Colors.white,
        elevation: 6,
        icon: const Icon(Icons.add),
        label: const Text("Post / Report", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      ),
    );
  }

  // TAB 1: 📢 COMPLAINTS & INCIDENTS (Facebook-Style Social Feed)
  Widget _buildComplaintsTab() {
    return FutureBuilder<List<CommunityIncident>>(
      future: _incidentsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFF8B5A2B)));
        }

        final all = snapshot.data ?? [];
        final filtered = all.where((item) {
          if (_searchQuery.isEmpty) return true;
          final q = _searchQuery.toLowerCase();
          return item.description.toLowerCase().contains(q) ||
              item.location.toLowerCase().contains(q) ||
              item.category.toLowerCase().contains(q);
        }).toList();

        if (filtered.isEmpty) {
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.campaign_outlined, size: 56, color: Color(0xFFDEC49B)),
                  const SizedBox(height: 12),
                  const Text("No complaints or hazards reported here", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF5C4033))),
                  const SizedBox(height: 6),
                  const Text("All is peaceful! Tap 'Post / Report' to report an animal incident.", textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
          physics: const BouncingScrollPhysics(),
          itemCount: filtered.length,
          itemBuilder: (context, idx) {
            final item = filtered[idx];
            return _buildFacebookStylePostCard(item);
          },
        );
      },
    );
  }

  Widget _buildFacebookStylePostCard(CommunityIncident post) {
    Color statusColor;
    String statusLabel;
    if (post.status == 'resolved') {
      statusColor = const Color(0xFF2E7D32);
      statusLabel = "🟢 Resolved / Secured";
    } else if (post.status == 'in-progress') {
      statusColor = const Color(0xFF1565C0);
      statusLabel = "🔵 Authority Dispatched";
    } else {
      statusColor = const Color(0xFFB78103);
      statusLabel = "🟡 Pending Investigation";
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFEADBC8), width: 1.2),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 3)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: const Color(0xFFDEC49B),
                  backgroundImage: post.authorAvatar != null ? AssetImage(post.authorAvatar!) : null,
                  child: post.authorAvatar == null ? const Icon(Icons.person, color: Color(0xFF5C4033), size: 20) : null,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(post.authorName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF5C4033))),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.location_on, size: 12, color: Color(0xFF8B5A2B)),
                          const SizedBox(width: 2),
                          Flexible(
                            child: Text(post.location, style: const TextStyle(fontSize: 11.5, color: Color(0xFF7A6458)), overflow: TextOverflow.ellipsis),
                          ),
                          const SizedBox(width: 6),
                          const Text("•", style: TextStyle(color: Colors.grey, fontSize: 10)),
                          const SizedBox(width: 6),
                          Text(post.reportedAt, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: statusColor.withOpacity(0.4)),
                  ),
                  child: Text(statusLabel, style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: statusColor)),
                ),
              ],
            ),
          ),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 4.0),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF9EED9),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFDEC49B)),
              ),
              child: Text(
                post.category,
                style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFF8B5A2B)),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Text(
              post.description,
              style: const TextStyle(fontSize: 13.5, height: 1.42, color: Color(0xFF4A3528)),
            ),
          ),

          if (post.photoUrl != null && post.photoUrl!.isNotEmpty)
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              height: 210,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                color: const Color(0xFFF9EED9),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: _buildPostPhoto(post.photoUrl!),
              ),
            ),

          if (post.authorityNotes != null && post.authorityNotes!.isNotEmpty)
            Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 6),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFEBF3EA),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF2E7D32).withOpacity(0.3)),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.verified, size: 16, color: Color(0xFF2E7D32)),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      "Official Update: ${post.authorityNotes}",
                      style: const TextStyle(fontSize: 12, color: Color(0xFF1B5E20), fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

          const SizedBox(height: 8),
          const Divider(height: 1, color: Color(0xFFF0EAE1)),

          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                TextButton.icon(
                  onPressed: () async {
                    HapticFeedback.lightImpact();
                    await _incidentService.toggleSupport(post);
                    _refreshIncidents();
                  },
                  icon: Icon(
                    post.isSupportedByMe ? Icons.favorite : Icons.favorite_border,
                    size: 18,
                    color: post.isSupportedByMe ? const Color(0xFF8B2500) : const Color(0xFF8B5A2B),
                  ),
                  label: Text(
                    "${post.supportCount} Support",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: post.isSupportedByMe ? const Color(0xFF8B2500) : const Color(0xFF5C4033),
                    ),
                  ),
                ),
                TextButton.icon(
                  onPressed: () => _openCommentsSheet(post),
                  icon: const Icon(Icons.chat_bubble_outline, size: 17, color: Color(0xFF8B5A2B)),
                  label: Text(
                    "${post.comments.length} Comments",
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF5C4033)),
                  ),
                ),
                TextButton.icon(
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: "[PetNexus Alert] ${post.category}: ${post.description} (${post.location})"));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text("Alert copied to clipboard to share with neighbors!")),
                    );
                  },
                  icon: const Icon(Icons.share_outlined, size: 17, color: Color(0xFF8B5A2B)),
                  label: const Text("Share", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPostPhoto(String path) {
    if (path.startsWith('assets/')) {
      return Image.asset(path, fit: BoxFit.cover);
    } else if (path.startsWith('http')) {
      return Image.network(
        path,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => const Center(child: Icon(Icons.pets, size: 48, color: Color(0xFFDEC49B))),
      );
    }
    return Image.asset('assets/images/dashboard_cat.png', fit: BoxFit.cover);
  }

  // TAB 2: 🚨 LOST PET ADVERTISEMENTS
  Widget _buildLostFoundTab() {
    return FutureBuilder<List<dynamic>>(
      future: _lostPetsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFF8B5A2B)));
        }

        final all = snapshot.data ?? [];
        final filtered = all.where((item) {
          if (_searchQuery.isEmpty) return true;
          final q = _searchQuery.toLowerCase();
          final name = (item['petName'] ?? item['title'] ?? '').toString().toLowerCase();
          final breed = (item['breed'] ?? '').toString().toLowerCase();
          final loc = (item['lastSeenLocation'] ?? '').toString().toLowerCase();
          return name.contains(q) || breed.contains(q) || loc.contains(q);
        }).toList();

        if (filtered.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.search_off, size: 56, color: Color(0xFFDEC49B)),
                const SizedBox(height: 12),
                const Text("No lost pet advertisements matching this search", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF5C4033))),
                const SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportLostScreen())),
                  icon: const Icon(Icons.add),
                  label: const Text("Post a Missing Pet Ad"),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B5A2B), foregroundColor: Colors.white),
                )
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 90),
          physics: const BouncingScrollPhysics(),
          itemCount: filtered.length,
          itemBuilder: (context, idx) {
            final pet = filtered[idx];
            final String name = pet['petName'] ?? pet['title'] ?? 'Unknown Pet';
            final String breed = pet['breed'] ?? 'Unknown Breed';
            final String color = pet['color'] ?? '';
            final String loc = pet['lastSeenLocation'] ?? 'Location not specified';
            final String desc = pet['description'] ?? 'No extra details provided.';
            final String contact = pet['contactInfo'] ?? 'Contact Municipal Desk';
            final String status = pet['status'] ?? pet['type'] ?? 'Lost';
            final bool isLost = status.toLowerCase() == 'lost';

            return Container(
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFDEC49B), width: 1.2),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.all(14.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isLost ? const Color(0xFFF9EED9) : const Color(0xFFE8F5E9),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: isLost ? const Color(0xFF8B5A2B) : const Color(0xFF2E7D32)),
                          ),
                          child: Text(
                            isLost ? "🐾 MISSING PET AD" : "✅ FOUND & REUNITED",
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isLost ? const Color(0xFF8B5A2B) : const Color(0xFF2E7D32),
                            ),
                          ),
                        ),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 14, color: Color(0xFF8B5A2B)),
                            const SizedBox(width: 4),
                            Text(loc, style: const TextStyle(fontSize: 12, color: Color(0xFF7A6458))),
                          ],
                        ),
                      ],
                    ),
                  ),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(14),
                          child: Container(
                            width: 80,
                            height: 80,
                            color: const Color(0xFFF9EED9),
                            child: Image.asset('assets/images/puppy.png', fit: BoxFit.cover),
                          ),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                              const SizedBox(height: 2),
                              Text("$breed • $color", style: const TextStyle(fontSize: 13, color: Color(0xFF7A6458))),
                              const SizedBox(height: 6),
                              Text(desc, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: Color(0xFF5C4033))),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),
                  const Divider(height: 1, color: Color(0xFFF0EAE1)),

                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.phone, size: 14, color: Color(0xFF8B5A2B)),
                            const SizedBox(width: 6),
                            Text("Contact: $contact", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                          ],
                        ),
                        TextButton(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: contact));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(content: Text("Contact $contact copied to clipboard!")),
                            );
                          },
                          child: const Text("Copy Info", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF8B5A2B))),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

class _CommunityTabsDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;
  _CommunityTabsDelegate({required this.tabBar});

  @override
  double get minExtent => tabBar.preferredSize.height + 10;
  @override
  double get maxExtent => tabBar.preferredSize.height + 10;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: const Color(0xFFFBF4E8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      alignment: Alignment.centerLeft,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFEADBC8)),
        ),
        child: tabBar,
      ),
    );
  }

  @override
  bool shouldRebuild(_CommunityTabsDelegate oldDelegate) => false;
}
