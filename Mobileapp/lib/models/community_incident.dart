class IncidentComment {
  final String authorName;
  final String text;
  final String timestamp;

  const IncidentComment({
    required this.authorName,
    required this.text,
    required this.timestamp,
  });

  Map<String, dynamic> toMap() => {
    'authorName': authorName,
    'text': text,
    'timestamp': timestamp,
  };

  factory IncidentComment.fromMap(Map<String, dynamic> map) {
    String formattedTime = 'Just now';
    if (map['createdAt'] != null) {
      try {
        final dt = DateTime.parse(map['createdAt'].toString()).toLocal();
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 60) {
          formattedTime = '${diff.inMinutes}m ago';
        } else if (diff.inHours < 24) {
          formattedTime = '${diff.inHours}h ago';
        } else {
          formattedTime = '${diff.inDays}d ago';
        }
      } catch (_) {
        formattedTime = 'Recent';
      }
    } else if (map['timestamp'] != null) {
      formattedTime = map['timestamp'].toString();
    }

    return IncidentComment(
      authorName: map['authorName'] ?? 'Neighbor',
      text: map['text'] ?? '',
      timestamp: formattedTime,
    );
  }
}

class CommunityIncident {
  final String id;
  final String authorName;
  final String? authorAvatar;
  final String category;
  final String location;
  final String description;
  final String? photoUrl;
  final String reportedAt;
  final String status; // 'pending', 'in-progress', 'resolved'
  final int supportCount;
  final bool isSupportedByMe;
  final List<IncidentComment> comments;
  final String? authorityNotes;

  CommunityIncident({
    required this.id,
    required this.authorName,
    this.authorAvatar,
    required this.category,
    required this.location,
    required this.description,
    this.photoUrl,
    required this.reportedAt,
    this.status = 'pending',
    this.supportCount = 0,
    this.isSupportedByMe = false,
    this.comments = const [],
    this.authorityNotes,
  });

  CommunityIncident copyWith({
    String? id,
    String? authorName,
    String? authorAvatar,
    String? category,
    String? location,
    String? description,
    String? photoUrl,
    String? reportedAt,
    String? status,
    int? supportCount,
    bool? isSupportedByMe,
    List<IncidentComment>? comments,
    String? authorityNotes,
  }) {
    return CommunityIncident(
      id: id ?? this.id,
      authorName: authorName ?? this.authorName,
      authorAvatar: authorAvatar ?? this.authorAvatar,
      category: category ?? this.category,
      location: location ?? this.location,
      description: description ?? this.description,
      photoUrl: photoUrl ?? this.photoUrl,
      reportedAt: reportedAt ?? this.reportedAt,
      status: status ?? this.status,
      supportCount: supportCount ?? this.supportCount,
      isSupportedByMe: isSupportedByMe ?? this.isSupportedByMe,
      comments: comments ?? this.comments,
      authorityNotes: authorityNotes ?? this.authorityNotes,
    );
  }

  factory CommunityIncident.fromBackendStray(Map<String, dynamic> json, {String? currentUserId}) {
    final reportedBy = json['reportedBy'];
    String author = 'Citizen Reporter';
    if (reportedBy is Map && reportedBy['fullName'] != null) {
      author = reportedBy['fullName'];
    }

    // 1. Category parsing: Check backend category first
    String cat = json['category'] ?? '';
    String desc = json['description'] ?? '';

    if (cat.isEmpty || cat == 'Other') {
      // Check for legacy bracket prefix: [Category]
      final bracketMatch = RegExp(r'^\[(.*?)\]').firstMatch(desc);
      if (bracketMatch != null && bracketMatch.group(1) != null) {
        cat = bracketMatch.group(1)!;
        desc = desc.substring(bracketMatch.end).trim();
      } else if (desc.toLowerCase().contains('aggressive') || desc.toLowerCase().contains('bite') || desc.toLowerCase().contains('barking')) {
        cat = 'Aggressive Stray Alert';
      } else if (desc.toLowerCase().contains('injured') || desc.toLowerCase().contains('hurt') || desc.toLowerCase().contains('bleeding')) {
        cat = 'Injured Animal in Need';
      } else if (desc.toLowerCase().contains('pack') || desc.toLowerCase().contains('many dogs')) {
        cat = 'Stray Dog Pack';
      } else if (desc.toLowerCase().contains('rabies')) {
        cat = 'Rabies Suspect & Welfare';
      } else {
        cat = 'Stray Animal Report';
      }
    }

    // 2. Supporters / Support Count parsing
    final supportCount = json['supportCount'] is int ? json['supportCount'] as int : 0;
    bool supportedByMe = false;
    if (currentUserId != null && json['supporters'] is List) {
      final supportersList = json['supporters'] as List;
      supportedByMe = supportersList.any((s) => s.toString() == currentUserId || (s is Map && s['_id']?.toString() == currentUserId));
    }

    // 3. Comments parsing
    List<IncidentComment> parsedComments = [];
    if (json['comments'] is List) {
      parsedComments = (json['comments'] as List)
          .map((c) => IncidentComment.fromMap(c as Map<String, dynamic>))
          .toList();
    }

    // 4. Time format
    String formattedDate = 'Recent';
    if (json['createdAt'] != null || json['reportedAt'] != null) {
      try {
        final dt = DateTime.parse(json['createdAt'] ?? json['reportedAt']).toLocal();
        final diff = DateTime.now().difference(dt);
        if (diff.inMinutes < 60) {
          formattedDate = '${diff.inMinutes} mins ago';
        } else if (diff.inHours < 24) {
          formattedDate = '${diff.inHours} hours ago';
        } else if (diff.inDays == 1) {
          formattedDate = 'Yesterday';
        } else {
          formattedDate = '${diff.inDays} days ago';
        }
      } catch (_) {
        formattedDate = 'Recent';
      }
    }

    return CommunityIncident(
      id: json['_id'] ?? json['id'] ?? 'inc-${DateTime.now().millisecondsSinceEpoch}',
      authorName: author,
      category: cat,
      location: json['location'] ?? 'Location not specified',
      description: desc,
      photoUrl: json['image'],
      reportedAt: formattedDate,
      status: json['status'] ?? 'pending',
      authorityNotes: json['authorityNotes'],
      supportCount: supportCount,
      isSupportedByMe: supportedByMe,
      comments: parsedComments,
    );
  }
}
