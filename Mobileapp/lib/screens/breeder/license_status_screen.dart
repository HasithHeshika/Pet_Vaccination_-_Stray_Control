import 'package:flutter/material.dart';
import '../../services/license_service.dart';

class LicenseStatusScreen extends StatefulWidget {
  const LicenseStatusScreen({super.key});

  @override
  State<LicenseStatusScreen> createState() => _LicenseStatusScreenState();
}

class _LicenseStatusScreenState extends State<LicenseStatusScreen> {
  late Future<List<dynamic>> _licensesFuture;

  @override
  void initState() {
    super.initState();
    _refreshList();
  }
  
  void _refreshList() {
    setState(() {
      _licensesFuture = LicenseService().getMyLicenses();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9EED9),
      appBar: AppBar(
        title: const Text("My Applications", style: TextStyle(color: Color(0xFF5C4033), fontWeight: FontWeight.bold)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFF5C4033)),
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _licensesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFF5C4033)));
          } else if (snapshot.hasError) {
            return Center(child: Text("Error fetching licenses: ${snapshot.error}", style: const TextStyle(color: Colors.red)));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return const Center(child: Text("You have no active licenses or applications.", style: TextStyle(color: Color(0xFF9E6D4E))));
          }

          final licenses = snapshot.data!;
          return ListView.builder(
            padding: const EdgeInsets.all(24),
            itemCount: licenses.length,
            itemBuilder: (context, index) {
              final license = licenses[index];
              return _buildLicenseCard(license);
            },
          );
        }
      ),
    );
  }

  Widget _buildLicenseCard(dynamic doc) {
     final status = doc['status'] ?? 'Pending';
     Color statusColor;
     if (status == 'Approved') statusColor = Colors.green;
     else if (status == 'Rejected') statusColor = Colors.red;
     else statusColor = const Color(0xFFDEC49B); // Pending / Draft Color Map

     return Card(
       margin: const EdgeInsets.only(bottom: 16),
       shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
       elevation: 3,
       child: Padding(
         padding: const EdgeInsets.all(20.0),
         child: Column(
           crossAxisAlignment: CrossAxisAlignment.start,
           children: [
             Row(
               mainAxisAlignment: MainAxisAlignment.spaceBetween,
               children: [
                 Text("License Request", style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF5C4033))),
                 Container(
                   padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                   decoration: BoxDecoration(color: statusColor.withAlpha(40), borderRadius: BorderRadius.circular(12)),
                   child: Text(status.toUpperCase(), style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 12)),
                 )
               ],
             ),
             const Divider(height: 32),
             Text("Applicant: ${doc['breederName']}", style: const TextStyle(color: Color(0xFF5C4033))),
             const SizedBox(height: 8),
             Text("Capacity: ${doc['numberOfAnimals'] ?? 0} Animals", style: const TextStyle(color: Color(0xFF5C4033))),
             const SizedBox(height: 8),
             Text("Submitted: ${doc['submittedAt'] != null ? doc['submittedAt'].toString().split('T')[0] : 'Drafting'}", style: const TextStyle(color: Colors.black54)),
           ],
         ),
       )
     );
  }
}
