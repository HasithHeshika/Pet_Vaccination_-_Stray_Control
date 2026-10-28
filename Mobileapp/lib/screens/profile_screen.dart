import 'package:flutter/material.dart';
import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import '../services/auth_service.dart';
import '../services/user_service.dart';
import 'login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _user;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchProfile();
  }

  void _fetchProfile() async {
    try {
      final data = await AuthService().getMe();
      if (mounted) {
        if (data != null && data['user'] != null) {
          setState(() {
            _user = data['user'];
            _isLoading = false;
          });
        } else {
          // Token is expired / null data (401 Unauthorized)
          setState(() {
            _user = null;
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _user = null;
          _isLoading = false;
        });
      }
    }
  }

  void _logout() async {
    await AuthService().logout();
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context, 
        MaterialPageRoute(builder: (_) => const LoginScreen()), 
        (route) => false
      );
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final XFile? image = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    
    if (image != null) {
       ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Uploading new profile picture...")));
       try {
          final bytes = await image.readAsBytes();
          final String base64Image = "data:image/jpeg;base64," + base64Encode(bytes);
          await UserService().updateProfilePicture(base64Image);
          _fetchProfile(); // Refresh Data seamlessly
       } catch (e) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Upload Error: $e"), backgroundColor: Colors.red));
       }
    }
  }

  void _showEditProfileDialog() {
     final nameController = TextEditingController(text: _user?['fullName'] ?? '');
     final phoneController = TextEditingController(text: _user?['phone'] ?? '');
     final nicController = TextEditingController(text: _user?['nicNumber'] ?? '');
     bool isSaving = false;

     showDialog(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (context, setStateModal) {
            return AlertDialog(
               backgroundColor: const Color(0xFFF9EED9),
               shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
               title: const Text("Edit Profile Details", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
               content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(controller: nameController, decoration: const InputDecoration(labelText: "Full Name")),
                    const SizedBox(height: 12),
                    TextField(controller: phoneController, decoration: const InputDecoration(labelText: "Phone Number")),
                    const SizedBox(height: 12),
                    TextField(controller: nicController, decoration: const InputDecoration(labelText: "NIC Number")),
                  ]
               ),
               actions: [
                  TextButton(child: const Text("CANCEL", style: TextStyle(color: Color(0xFF9E6D4E))), onPressed: () => Navigator.pop(ctx)),
                  ElevatedButton(
                     style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5C4033), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                     child: isSaving ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text("SAVE"),
                     onPressed: isSaving ? null : () async {
                        setStateModal(() => isSaving = true);
                        try {
                          await UserService().updateProfile({
                            'fullName': nameController.text,
                            'phone': phoneController.text,
                            'nicNumber': nicController.text
                          });
                          if (mounted) {
                            Navigator.pop(ctx);
                            _fetchProfile(); // Refresh screen silently
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Profile details updated successfully!")));
                          }
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red));
                          setStateModal(() => isSaving = false);
                        }
                     }
                  )
               ]
            );
          }
        )
      );
  }
  
  void _showChangePasswordDialog() {
     final currentPasswordController = TextEditingController();
     final newPasswordController = TextEditingController();
     bool isChanging = false;
     
     showDialog(
        context: context,
        builder: (ctx) => StatefulBuilder(
          builder: (context, setStateModal) {
            return AlertDialog(
               backgroundColor: const Color(0xFFF9EED9),
               shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
               title: const Text("Change Password", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
               content: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(controller: currentPasswordController, obscureText: true, decoration: const InputDecoration(labelText: "Current Password")),
                    const SizedBox(height: 16),
                    TextField(controller: newPasswordController, obscureText: true, decoration: const InputDecoration(labelText: "New Password")),
                  ]
               ),
               actions: [
                  TextButton(child: const Text("CANCEL", style: TextStyle(color: Color(0xFF9E6D4E))), onPressed: () => Navigator.pop(ctx)),
                  ElevatedButton(
                     style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5C4033), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                     child: isChanging ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Text("UPDATE"),
                     onPressed: isChanging ? null : () async {
                        if (currentPasswordController.text.isEmpty || newPasswordController.text.isEmpty) {
                           ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Please fill all password fields!")));
                           return;
                        }
                        setStateModal(() => isChanging = true);
                        try {
                          await UserService().changePassword(currentPasswordController.text, newPasswordController.text);
                          if (mounted) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Password updated successfully!")));
                          }
                        } catch (e) {
                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error: $e"), backgroundColor: Colors.red));
                          setStateModal(() => isChanging = false);
                        }
                     }
                  )
               ]
            );
          }
        )
      );
  }

  ImageProvider _getProfileImage() {
    final pic = _user?['profilePicture']?.toString();
    if (pic == null || pic.isEmpty) {
      return const AssetImage('assets/images/dashboard_cat.png');
    }
    if (pic.startsWith('http')) {
      return NetworkImage(pic);
    }
    if (pic.startsWith('data:image')) {
      try {
        final base64String = pic.split(',').last;
        // Need to remove whitespaces/newlines just in case
        final cleanBase64 = base64String.replaceAll(RegExp(r'\s+'), '');
        return MemoryImage(base64Decode(cleanBase64));
      } catch (e) {
        // Fallback if decode fails
      }
    }
    return const AssetImage('assets/images/dashboard_cat.png');
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(backgroundColor: Color(0xFFF9EED9), body: Center(child: CircularProgressIndicator(color: Color(0xFF5C4033))));
    }
    
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Color(0xFF8B3A3A)),
            tooltip: "Log Out",
            onPressed: _logout,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
             // Session Expired Banner if user data couldn't be loaded
             if (_user == null)
               Container(
                 margin: const EdgeInsets.only(bottom: 24),
                 padding: const EdgeInsets.all(16),
                 decoration: BoxDecoration(
                   color: const Color(0xFFFFEBEE),
                   borderRadius: BorderRadius.circular(16),
                   border: Border.all(color: Colors.red.shade300),
                 ),
                 child: Row(
                   children: [
                     const Icon(Icons.lock_clock, color: Colors.red),
                     const SizedBox(width: 12),
                     const Expanded(
                       child: Column(
                         crossAxisAlignment: CrossAxisAlignment.start,
                         children: [
                           Text(
                             "Session Expired",
                             style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 15),
                           ),
                           Text(
                             "Please log in again to sync your account details.",
                             style: TextStyle(color: Colors.black87, fontSize: 12),
                           ),
                         ],
                       ),
                     ),
                     ElevatedButton(
                       onPressed: _logout,
                       style: ElevatedButton.styleFrom(
                         backgroundColor: Colors.red.shade700,
                         foregroundColor: Colors.white,
                         padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                       ),
                       child: const Text("Log In", style: TextStyle(fontSize: 12)),
                     ),
                   ],
                 ),
               ),

             // Avatar
             Stack(
               children: [
                 CircleAvatar(
                   radius: 60,
                   backgroundImage: _getProfileImage(),
                   backgroundColor: const Color(0xFFDEC49B),
                 ),
                 Positioned(
                   bottom: 0, right: 0,
                   child: CircleAvatar(
                      backgroundColor: const Color(0xFF8B5A2B),
                      radius: 20,
                      child: IconButton(icon: const Icon(Icons.camera_alt, color: Colors.white, size: 18), onPressed: _pickImage),
                   )
                 )
               ],
             ),
             const SizedBox(height: 16),
             Text(_user?['fullName'] ?? 'Pet Lover', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
             Text(_user?['email'] ?? 'Session Expired', style: const TextStyle(fontSize: 16, color: Color(0xFF9E6D4E))),
             const SizedBox(height: 32),
             
             // Info Section
             Container(
               decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withAlpha(10), blurRadius: 10, offset: const Offset(0,5))]),
               child: Column(
                 children: [
                   ListTile(leading: const Icon(Icons.person, color: Color(0xFF8B5A2B)), title: const Text("Role"), trailing: Text((_user?['role'] ?? 'User').toUpperCase(), style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5C4033)))),
                   const Divider(height: 0),
                   ListTile(leading: const Icon(Icons.badge, color: Color(0xFF8B5A2B)), title: const Text("NIC Number"), trailing: Text(_user?['nicNumber'] ?? 'N/A', style: const TextStyle(color: Color(0xFF9E6D4E)))),
                   const Divider(height: 0),
                   ListTile(leading: const Icon(Icons.phone, color: Color(0xFF8B5A2B)), title: const Text("Phone Number"), trailing: Text(_user?['phone'] ?? 'N/A', style: const TextStyle(color: Color(0xFF9E6D4E)))),
                 ],
               )
             ),
             const SizedBox(height: 24),
             
             // Actions
             Container(
               decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withAlpha(10), blurRadius: 10, offset: const Offset(0,5))]),
               child: Column(
                 children: [
                   ListTile(
                     leading: const Icon(Icons.edit, color: Color(0xFF8B5A2B)), 
                     title: const Text("Edit Profile Details", style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                     trailing: const Icon(Icons.chevron_right),
                     onTap: _showEditProfileDialog
                   ),
                   const Divider(height: 0),
                   ListTile(
                     leading: const Icon(Icons.lock_reset, color: Color(0xFF8B5A2B)), 
                     title: const Text("Change Password", style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                     trailing: const Icon(Icons.chevron_right),
                     onTap: _showChangePasswordDialog
                   ),
                 ],
               )
             ),
             
             const SizedBox(height: 48),
             SizedBox(
               width: double.infinity,
               child: ElevatedButton.icon(
                 onPressed: _logout,
                 icon: const Icon(Icons.logout, color: Colors.white),
                 label: const Text(
                   "LOG OUT", 
                   style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1.2)
                 ),
                 style: ElevatedButton.styleFrom(
                   backgroundColor: const Color(0xFF8B3A3A), 
                   padding: const EdgeInsets.symmetric(vertical: 16),
                   shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                 ),
               ),
             ),
          ]
        ),
      ),
    );
  }
}
