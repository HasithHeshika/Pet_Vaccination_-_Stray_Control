import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../services/auth_service.dart';
import 'home_screen.dart';

class SignupScreen extends StatefulWidget {
  const SignupScreen({super.key});

  @override
  State<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends State<SignupScreen> {
  final _formKey = GlobalKey<FormState>();
  
  String _accountType = 'pet_owner'; // Default role alignment mapped visually
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _nicController = TextEditingController();
  
  final _streetController = TextEditingController();
  final _cityController = TextEditingController();
  String? _province;
  final _postalController = TextEditingController();

  bool _isLoading = false;

  void _signup() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passwordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final userData = {
        'fullName': _nameController.text.trim(),
        'email': _emailController.text.trim(),
        'password': _passwordController.text,
        'phone': _phoneController.text.trim(),
        'nicNumber': _nicController.text.trim(),
        'role': _accountType, // backend requires valid role enum
        'address': {
          'street': _streetController.text.trim(),
          'city': _cityController.text.trim(),
          'province': _province ?? 'Western', 
          'postalCode': _postalController.text.trim(),
        }
      };

      await AuthService().signup(userData);
      
      // Auto login post registration
      await AuthService().login(_emailController.text.trim(), _passwordController.text);

      if (mounted) {
        // Push Replacement to pop out of signup/login loop and drop onto Home
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => const HomeScreen()), 
          (route) => false
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', '')))
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 10.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header aligned with mockup Web design
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(Icons.pets, color: AppTheme.primaryBrown),
                  SizedBox(width: 8),
                  Text("Sign Up", style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                  SizedBox(width: 8),
                  Icon(Icons.pets, color: AppTheme.primaryBrown),
                ],
              ),
              const SizedBox(height: 32),
              
              _buildDropdown("Account Type *", ['pet_owner', 'citizen', 'veterinarian'], _accountType, (v) => setState(() => _accountType = v!)),
              const SizedBox(height: 16),
              
              _buildField("Full Name *", _nameController),
              const SizedBox(height: 16),
              _buildField("Email *", _emailController, TextInputType.emailAddress),
              const SizedBox(height: 16),
              _buildField("Password * (min 6 characters)", _passwordController, TextInputType.text, true),
              const SizedBox(height: 16),
              _buildField("Confirm Password *", _confirmPasswordController, TextInputType.text, true),
              const SizedBox(height: 16),
              _buildField("Phone Number *", _phoneController, TextInputType.phone),
              const SizedBox(height: 16),
              _buildField("NIC Number *", _nicController),
              
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 24.0),
                child: Text("Address Information", style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
              ),
              
              _buildField("Street Address *", _streetController),
              const SizedBox(height: 16),
              _buildField("City *", _cityController),
              const SizedBox(height: 16),
              _buildDropdown("Province *", ['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'], _province ?? 'Western', (v) => setState(() => _province = v!)),
              const SizedBox(height: 16),
              _buildField("Postal Code *", _postalController, TextInputType.number),
              
              const SizedBox(height: 32),
              
              ElevatedButton(
                onPressed: _isLoading ? null : _signup,
                style: ElevatedButton.styleFrom(
                   backgroundColor: const Color(0xFF5C4033),
                   padding: const EdgeInsets.symmetric(vertical: 16),
                   shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))
                ),
                child: _isLoading 
                     ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                     : const Text("Sign Up", style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text("Already have an account? ", style: TextStyle(color: Color(0xFF5C4033))),
                  GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: const Text("Login", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
                  )
                ],
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildField(String label, TextEditingController controller, [TextInputType type = TextInputType.text, bool obs = false]) {
    return TextFormField(
      controller: controller,
      obscureText: obs,
      keyboardType: type,
      validator: (v) => v!.isEmpty ? 'Required' : null,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF5C4033), fontSize: 14),
        filled: true,
        fillColor: const Color(0xFFF5E6CD),
        contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFC0A080))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFC0A080))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF5C4033), width: 2)),
      ),
    );
  }

  Widget _buildDropdown(String label, List<String> items, String current, void Function(String?) onChanged) {
    return DropdownButtonFormField<String>(
      value: current,
      onChanged: onChanged,
      items: items.map((i) => DropdownMenuItem(value: i, child: Text(i))).toList(),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF5C4033), fontSize: 14),
        filled: true,
        fillColor: const Color(0xFFF5E6CD),
        contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFC0A080))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFC0A080))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF5C4033), width: 2)),
      ),
    );
  }
}
