const express = require('express');
const router = express.Router();
const Vaccination = require('../models/Vaccination');
const Pet = require('../models/Pet');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/vaccinations
// @desc    Add a new vaccination record
// @access  Admin only
router.post('/', [auth, admin], async (req, res) => {
  try {
    const {
      petId,
      vaccineType,
      vaccineName,
      dateAdministered,
      nextDueDate,
      veterinarianName,
      clinicName,
      batchNumber,
      notes,
      status,
      notificationPreference
    } = req.body;

    // Verify pet exists
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    const vaccination = new Vaccination({
      pet: petId,
      vaccineType,
      vaccineName,
      dateAdministered,
      nextDueDate,
      veterinarianName,
      clinicName,
      batchNumber,
      notes,
      status: status || 'administered',
      notificationPreference,
      createdBy: req.user.userId
    });

    await vaccination.save();

    const populatedVaccination = await Vaccination.findById(vaccination._id)
      .populate('pet')
      .populate('createdBy', 'fullName email');

    res.status(201).json({
      message: 'Vaccination record created successfully',
      vaccination: populatedVaccination
    });
  } catch (error) {
    console.error('Error creating vaccination record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vaccinations/pet/:petId
// @desc    Get all vaccination records for a specific pet
// @access  Private (owner or admin)
router.get('/pet/:petId', auth, async (req, res) => {
  try {
    const { petId } = req.params;

    // Verify pet exists
    const pet = await Pet.findById(petId).populate('owner');
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }

    // Check if user is owner or admin
    if (!req.user.isAdmin && pet.owner._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const vaccinations = await Vaccination.find({ pet: petId })
      .populate('createdBy', 'fullName')
      .sort({ dateAdministered: -1 });

    res.json({
      vaccinations,
      pet: {
        petId: pet.petId,
        petName: pet.petName,
        petType: pet.petType
      }
    });
  } catch (error) {
    console.error('Error fetching vaccination records:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vaccinations/upcoming
// @desc    Get upcoming vaccinations (next 30 days)
// @access  Admin only
router.get('/upcoming', [auth, admin], async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days) || 30;
    const vaccinations = await Vaccination.findUpcoming(daysAhead);

    res.json({ vaccinations, count: vaccinations.length });
  } catch (error) {
    console.error('Error fetching upcoming vaccinations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vaccinations/overdue
// @desc    Get overdue vaccinations
// @access  Admin only
router.get('/overdue', [auth, admin], async (req, res) => {
  try {
    const vaccinations = await Vaccination.findOverdue();

    res.json({ vaccinations, count: vaccinations.length });
  } catch (error) {
    console.error('Error fetching overdue vaccinations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vaccinations/user/upcoming
// @desc    Get upcoming vaccinations for current user's pets
// @access  Private
router.get('/user/upcoming', auth, async (req, res) => {
  try {
    // Find all pets belonging to the user
    const pets = await Pet.find({ owner: req.user.userId });
    const petIds = pets.map(pet => pet._id);

    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const vaccinations = await Vaccination.find({
      pet: { $in: petIds },
      nextDueDate: { $gte: now, $lte: futureDate },
      status: { $in: ['scheduled', 'administered'] }
    })
      .populate('pet')
      .sort({ nextDueDate: 1 });

    res.json({ vaccinations, count: vaccinations.length });
  } catch (error) {
    console.error('Error fetching user vaccinations:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/vaccinations/:id
// @desc    Update a vaccination record
// @access  Admin only
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const vaccination = await Vaccination.findById(id);
    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination record not found' });
    }

    // Update fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        vaccination[key] = updateData[key];
      }
    });

    await vaccination.save();

    const updatedVaccination = await Vaccination.findById(id)
      .populate('pet')
      .populate('createdBy', 'fullName email');

    res.json({
      message: 'Vaccination record updated successfully',
      vaccination: updatedVaccination
    });
  } catch (error) {
    console.error('Error updating vaccination record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/vaccinations/:id
// @desc    Delete a vaccination record
// @access  Admin only
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const { id } = req.params;

    const vaccination = await Vaccination.findById(id);
    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination record not found' });
    }

    await vaccination.deleteOne();

    res.json({ message: 'Vaccination record deleted successfully' });
  } catch (error) {
    console.error('Error deleting vaccination record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vaccinations/:id
// @desc    Get a single vaccination record
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const vaccination = await Vaccination.findById(id)
      .populate('pet')
      .populate('createdBy', 'fullName email');

    if (!vaccination) {
      return res.status(404).json({ message: 'Vaccination record not found' });
    }

    // Check if user is owner or admin
    const pet = await Pet.findById(vaccination.pet._id).populate('owner');
    if (!req.user.isAdmin && pet.owner._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ vaccination });
  } catch (error) {
    console.error('Error fetching vaccination record:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
