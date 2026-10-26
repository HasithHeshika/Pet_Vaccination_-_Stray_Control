import 'dart:convert';
import 'package:flutter/material.dart';

// Small shared pieces for the admin screens
const Color adminBrown = Color(0xFF5C4033);
const Color adminLightBrown = Color(0xFF8B5A2B);
const Color adminCream = Color(0xFFF9EED9);

// Image from an http(s) link or a base64 data URL (as stored by the API)
Widget sourceImage(String source, {double size = 96, BoxFit fit = BoxFit.cover}) {
  Widget broken() => SizedBox(width: size, height: size, child: const Icon(Icons.broken_image, color: Colors.grey));
  try {
    if (source.startsWith('data:image')) {
      return Image.memory(base64Decode(source.split(',').last), width: size, height: size, fit: fit,
          errorBuilder: (_, _, _) => broken());
    }
    if (source.startsWith('http://') || source.startsWith('https://')) {
      return Image.network(source, width: size, height: size, fit: fit, errorBuilder: (_, _, _) => broken());
    }
  } catch (_) {}
  return broken();
}

String shortDate(dynamic value) {
  if (value == null) return '-';
  final date = DateTime.tryParse(value.toString());
  if (date == null) return '-';
  final local = date.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
}

void showAdminSnack(BuildContext context, String message, {bool isError = false}) {
  ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(message), backgroundColor: isError ? Colors.red : null),
  );
}

String errorText(Object error) => error.toString().replaceAll('Exception: ', '');

class StatusChip extends StatelessWidget {
  final String label;
  final Color color;
  const StatusChip(this.label, this.color, {super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(color: color.withAlpha(38), borderRadius: BorderRadius.circular(20)),
      child: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
    );
  }
}

// Standard loading / error / empty / list states with pull-to-refresh
class AdminListState extends StatelessWidget {
  final bool loading;
  final String? error;
  final bool isEmpty;
  final String emptyText;
  final Future<void> Function() onRefresh;
  final Widget child;

  const AdminListState({
    super.key,
    required this.loading,
    required this.error,
    required this.isEmpty,
    required this.emptyText,
    required this.onRefresh,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator(color: adminBrown));
    if (error != null || isEmpty) {
      return RefreshIndicator(
        onRefresh: onRefresh,
        child: ListView(
          children: [
            const SizedBox(height: 120),
            Icon(error != null ? Icons.error_outline : Icons.inbox, size: 56, color: adminLightBrown),
            const SizedBox(height: 12),
            Text(error ?? emptyText, textAlign: TextAlign.center, style: const TextStyle(color: adminBrown)),
            if (error != null)
              Center(child: TextButton(onPressed: onRefresh, child: const Text('Try again'))),
          ],
        ),
      );
    }
    return RefreshIndicator(onRefresh: onRefresh, child: child);
  }
}
