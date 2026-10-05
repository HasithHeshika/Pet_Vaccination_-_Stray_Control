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
      if (mounted && data != null) {
        setState(() {
          _user = data['user'];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
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
              content: SingleChildScrollView(
                child: Column(
                   mainAxisSize: MainAxisSize.min,
                   children: [
                     TextField(controller: nameController, decoration: const InputDecoration(labelText: "Full Name")),
                     const SizedBox(height: 16),
                     TextField(controller: phoneController, decoration: const InputDecoration(labelText: "Phone Number"), keyboardType: TextInputType.phone),
                     const SizedBox(height: 16),
                     TextField(controller: nicController, decoration: const InputDecoration(labelText: "NIC Number")),
                   ]
                ),
              ),
              actions: [
                 TextButton(child: const Text("CANCEL", style: TextStyle(color: Color(0xFF9E6D4E))), onPressed: () => Navigator.pop(ctx)),
                 ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF5C4033), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                    child: isSaving 
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                        : const Text("SAVE", style: TextStyle(color: Colors.white)),
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
                    child: isChanging 
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) 
                        : const Text("SAVE", style: TextStyle(color: Colors.white)),
                    onPressed: isChanging ? null : () async {
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
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          children: [
             // Avatar
             Stack(
               children: [
                 CircleAvatar(
                   radius: 60,
                   backgroundImage: (_user?['profilePicture'] != null && _user!['profilePicture'].toString().isNotEmpty)
                       ? NetworkImage(_user!['profilePicture'])
                       : const AssetImage('assets/images/dashboard_cat.png') as ImageProvider,
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
             Text(_user?['fullName'] ?? 'Loading...', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
             Text(_user?['email'] ?? '', style: const TextStyle(fontSize: 16, color: Color(0xFF9E6D4E))),
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
