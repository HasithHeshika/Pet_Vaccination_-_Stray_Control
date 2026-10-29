import 'dart:io';
import 'package:flutter/material.dart';

class HealthRecordItem {
  final String title;
  final String date;
  final String status;
  final String clinic;
  final bool isVerified;

  const HealthRecordItem({
    required this.title,
    required this.date,
    this.status = 'Verified',
    this.clinic = 'Licensed Veterinary Clinic',
    this.isVerified = true,
  });

  Map<String, dynamic> toMap() => {
    'title': title,
    'date': date,
    'status': status,
    'clinic': clinic,
    'isVerified': isVerified,
  };

  factory HealthRecordItem.fromMap(Map<String, dynamic> map) {
    return HealthRecordItem(
      title: map['title'] ?? map['vaccineName'] ?? map['name'] ?? 'General Checkup',
      date: map['date'] ?? map['vaccinationDate'] ?? map['administeredDate'] ?? 'Recent',
      status: map['status'] ?? 'Verified',
      clinic: map['clinic'] ?? map['administeredBy'] ?? 'Licensed Veterinary Clinic',
      isVerified: map['isVerified'] ?? true,
    );
  }
}

class CommunityListing {
  final String id;
  final String petName;
  final String breed;
  final String category; // 'Adoption' or 'Breeding Match'
  final List<String> tags;
  final String age;
  final String gender;
  final String city;
  final String timestamp;
  final String description;
  final String ownerName;
  final String ownerPhone;
  final String? originalPhotoUrl;
  final File? localImageFile;
  final String emoji;
  final Color pastelColor;
  final bool isHealthVerified;
  final List<HealthRecordItem> healthRecords;
  final bool isFree;
  // Listing lifecycle status (Available/Pending/Adopted/Cancelled for adoption;
  // Active/Mated/Paused for breeding)
  final String listingStatus;

  CommunityListing({
    required this.id,
    required this.petName,
    required this.breed,
    required this.category,
    required this.tags,
    required this.age,
    required this.gender,
    required this.city,
    required this.timestamp,
    required this.description,
    required this.ownerName,
    required this.ownerPhone,
    this.originalPhotoUrl,
    this.localImageFile,
    this.emoji = '🐾',
    this.pastelColor = const Color(0xFFFDEED9),
    this.isHealthVerified = true,
    this.healthRecords = const [],
    this.isFree = true,
    this.listingStatus = 'Available',
  });

  CommunityListing copyWith({
    String? id,
    String? petName,
    String? breed,
    String? category,
    List<String>? tags,
    String? age,
    String? gender,
    String? city,
    String? timestamp,
    String? description,
    String? ownerName,
    String? ownerPhone,
    String? originalPhotoUrl,
    File? localImageFile,
    String? emoji,
    Color? pastelColor,
    bool? isHealthVerified,
    List<HealthRecordItem>? healthRecords,
    bool? isFree,
    String? listingStatus,
  }) {
    return CommunityListing(
      id: id ?? this.id,
      petName: petName ?? this.petName,
      breed: breed ?? this.breed,
      category: category ?? this.category,
      tags: tags ?? this.tags,
      age: age ?? this.age,
      gender: gender ?? this.gender,
      city: city ?? this.city,
      timestamp: timestamp ?? this.timestamp,
      description: description ?? this.description,
      ownerName: ownerName ?? this.ownerName,
      ownerPhone: ownerPhone ?? this.ownerPhone,
      originalPhotoUrl: originalPhotoUrl ?? this.originalPhotoUrl,
      localImageFile: localImageFile ?? this.localImageFile,
      emoji: emoji ?? this.emoji,
      pastelColor: pastelColor ?? this.pastelColor,
      isHealthVerified: isHealthVerified ?? this.isHealthVerified,
      healthRecords: healthRecords ?? this.healthRecords,
      isFree: isFree ?? this.isFree,
      listingStatus: listingStatus ?? this.listingStatus,
    );
  }
}
