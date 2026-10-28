import 'package:shared_preferences/shared_preferences.dart';
import '../models/community_incident.dart';
import 'stray_service.dart';

class CommunityIncidentService {
  static final CommunityIncidentService _instance = CommunityIncidentService._internal();
  factory CommunityIncidentService() => _instance;
  CommunityIncidentService._internal() {
    _seedInitialIncidents();
  }

  final StrayService _strayService = StrayService();
  final List<CommunityIncident> _localIncidents = [];

  void _seedInitialIncidents() {
    _localIncidents.addAll([
      CommunityIncident(
        id: 'inc-001',
        authorName: 'Kasun Bandara',
        authorAvatar: 'assets/images/dashboard_cat.png',
        category: 'Aggressive Stray Alert',
        location: 'Reid Avenue, near University Gate, Colombo 07',
        description: 'A pack of 3 stray dogs has been chasing passing motorcyclists and barking aggressively at school children around 7:30 AM. One brown dog appears agitated. Please have animal control investigate.',
        photoUrl: 'assets/images/login_dog.png',
        reportedAt: '25 mins ago',
        status: 'in-progress',
        supportCount: 14,
        isSupportedByMe: true,
        authorityNotes: 'CMC Animal Control Unit dispatched vehicle #04.',
        comments: [
          const IncidentComment(
            authorName: 'Dr. Sarah (Vet)',
            text: 'I passed by earlier. Please keep distance and avoid shouting as it agitates the pack.',
            timestamp: '15 mins ago',
          ),
          const IncidentComment(
            authorName: 'Municipality Officer',
            text: 'Rescue patrol is on route to verify vaccination tags and collar IDs.',
            timestamp: '5 mins ago',
          ),
        ],
      ),
      CommunityIncident(
        id: 'inc-002',
        authorName: 'Dilani Samarasinghe',
        category: 'Injured Animal in Need',
        location: 'High Level Road, Pannipitiya Junction',
        description: 'Found a stray puppy with an injured left front paw sitting by the bus stop. Needs medical attention and dressing. I gave clean water and dog biscuits.',
        photoUrl: 'assets/images/puppy.png',
        reportedAt: '2 hours ago',
        status: 'pending',
        supportCount: 28,
        isSupportedByMe: false,
        comments: [
          const IncidentComment(
            authorName: 'Pet Care Volunteer',
            text: 'Thank you Dilani! Local shelter volunteer is heading there with a rescue crate.',
            timestamp: '45 mins ago',
          ),
        ],
      ),
      CommunityIncident(
        id: 'inc-003',
        authorName: 'Mohamed Farhan',
        category: 'Rabies Suspect & Welfare',
        location: 'Kandy Road, Kiribathgoda Town',
        description: 'Stray dog showing hypersalivation and staggering gait near the marketplace. Shop owners are keeping everyone clear. Urgent municipal assistance requested.',
        photoUrl: 'assets/images/kitten_puppy.png',
        reportedAt: 'Yesterday',
        status: 'resolved',
        supportCount: 42,
        isSupportedByMe: false,
        authorityNotes: 'Animal safely captured and placed under veterinary quarantine for rabies observation.',
        comments: [
          const IncidentComment(
            authorName: 'Municipality Health Dept',
            text: 'Animal safely secured by certified veterinary officers. Area disinfected.',
            timestamp: 'Yesterday evening',
          ),
        ],
      ),
    ]);
  }

  Future<List<CommunityIncident>> getIncidents() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final currentUserId = prefs.getString('userId');

      final backendReports = await _strayService.getStrayReports();
      final List<CommunityIncident> list = [];

      for (var r in backendReports) {
        if (r is Map<String, dynamic>) {
          list.add(CommunityIncident.fromBackendStray(r, currentUserId: currentUserId));
        }
      }

      // Combine with local mock/sample incidents without duplicating ids
      for (var local in _localIncidents) {
        if (!list.any((item) => item.id == local.id)) {
          list.add(local);
        }
      }

      return list;
    } catch (_) {
      // Fallback to local incidents if network offline
      return List.from(_localIncidents);
    }
  }

  Future<CommunityIncident> reportIncident({
    required String authorName,
    required String category,
    required String location,
    required String description,
    String? photoUrl,
  }) async {
    // 1. Try sending to backend (category is now sent as a dedicated field)
    try {
      await _strayService.reportStray({
        'location': location,
        'description': description,
        'category': category,
        if (photoUrl != null) 'image': photoUrl,
      });
    } catch (_) {
      // Ignore backend error and keep locally
    }

    // 2. Add to local list
    final newIncident = CommunityIncident(
      id: 'inc-${DateTime.now().millisecondsSinceEpoch}',
      authorName: authorName,
      category: category,
      location: location,
      description: description,
      photoUrl: photoUrl,
      reportedAt: 'Just now',
      status: 'pending',
      supportCount: 1,
      isSupportedByMe: true,
      comments: [
        const IncidentComment(
          authorName: 'PetNexus Bot',
          text: 'Incident report submitted and broadcasted to community feed.',
          timestamp: 'Just now',
        ),
      ],
    );

    _localIncidents.insert(0, newIncident);
    return newIncident;
  }

  /// Toggle support: Call backend API if authenticated, and update local state
  Future<void> toggleSupport(CommunityIncident incident) async {
    // 1. Optimistic local update
    final index = _localIncidents.indexWhere((i) => i.id == incident.id);
    final newSupportState = !incident.isSupportedByMe;
    final newCount = newSupportState ? incident.supportCount + 1 : (incident.supportCount > 0 ? incident.supportCount - 1 : 0);

    if (index != -1) {
      _localIncidents[index] = incident.copyWith(
        isSupportedByMe: newSupportState,
        supportCount: newCount,
      );
    }

    // 2. Network sync if not a pure local mock
    if (!incident.id.startsWith('inc-00') && !incident.id.startsWith('mock-')) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('token');
        if (token != null && token.isNotEmpty) {
          await _strayService.toggleSupport(incident.id, token);
        }
      } catch (_) {
        // Fallback gracefully on network error
      }
    }
  }

  /// Add comment: Call backend API if authenticated, and update local state
  Future<IncidentComment> addComment(String incidentId, String authorName, String commentText) async {
    final newComment = IncidentComment(
      authorName: authorName,
      text: commentText,
      timestamp: 'Just now',
    );

    // 1. Update local list
    final index = _localIncidents.indexWhere((i) => i.id == incidentId);
    if (index != -1) {
      final item = _localIncidents[index];
      final newComments = List<IncidentComment>.from(item.comments)..add(newComment);
      _localIncidents[index] = item.copyWith(comments: newComments);
    }

    // 2. Network sync if not a pure mock
    if (!incidentId.startsWith('inc-00') && !incidentId.startsWith('mock-')) {
      try {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString('token');
        if (token != null && token.isNotEmpty) {
          await _strayService.addComment(incidentId, commentText, token);
        }
      } catch (_) {
        // Fallback gracefully on network error
      }
    }

    return newComment;
  }
}
