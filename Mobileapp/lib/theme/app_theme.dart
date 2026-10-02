import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Theme Colors
  static const Color background = Color(0xFFFAEDCD);
  static const Color primaryText = Color(0xFF5C4033);
  static const Color primaryBrown = Color(0xFF8B5A2B);
  static const Color secondaryGold = Color(0xFFD4A373);
  static const Color activeOrange = Color(0xFFE6A565);
  static const Color whiteCard = Color(0xFFFFFFFF);

  static ThemeData get theme {
    return ThemeData(
      primaryColor: primaryBrown,
      scaffoldBackgroundColor: background,
      textTheme: GoogleFonts.nunitoTextTheme().apply(
        bodyColor: primaryText,
        displayColor: primaryText,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: background,
        elevation: 0,
        iconTheme: IconThemeData(color: primaryText),
        titleTextStyle: TextStyle(
          color: primaryText,
          fontSize: 22,
          fontWeight: FontWeight.w800,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryBrown,
          foregroundColor: Colors.white,
          elevation: 3,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
          textStyle: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: secondaryGold, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: primaryBrown, width: 2),
        ),
        hintStyle: TextStyle(color: primaryText.withOpacity(0.5)),
      ),
      cardTheme: CardThemeData(
        color: whiteCard,
        elevation: 4,
        shadowColor: secondaryGold.withOpacity(0.4),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
        ),
      ),
    );
  }
}
