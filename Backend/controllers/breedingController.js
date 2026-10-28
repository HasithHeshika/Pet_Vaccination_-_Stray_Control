const mongoose = require('mongoose');
const BreedingListing = require('../models/BreedingListing');

// ────────────────────────────────────────────────────────────────────────────
// @desc    Create a new breeding listing
// @route   POST /api/breeding-matches
// @access  Private (auth)
// ────────────────────────────────────────────────────────────────────────────
exports.createListing = async (req, res) => {
  try {
    const {
      petName, species, breed, gender, age, photos,
      pedigreeDetails, breederLicense, healthClearances,
      studTerms, city, district
    } = req.body;

    const listing = new BreedingListing({
      petName,
      species,
      breed,
      gender,
      age,
      photos: photos || [],
      pedigreeDetails: pedigreeDetails || '',
      breederLicense: breederLicense || null,
      healthClearances: healthClearances || [],
      studTerms: studTerms || '',
      city,
      district,
      owner: req.user.id
    });

    await listing.save();
    await listing.populate([
      { path: 'owner', select: 'fullName email phone' },
      { path: 'breederLicense', select: 'licenseId breederName status' }
    ]);

    return res.status(201).json({
      message: 'Breeding listing created successfully',
      listing
    });
  } catch (error) {
    console.error('Create breeding listing error:', error);
    return res.status(500).json({ message: 'Server error while creating breeding listing' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Get all breeding listings with optional filters
// @route   GET /api/breeding-matches
// @access  Public
// ────────────────────────────────────────────────────────────────────────────
exports.getAllListings = async (req, res) => {
  try {
    const { species, breed, gender, city, district, hasLicense, status, search, page = 1, limit = 20 } = req.query;

    const query = {};

    // Default to Active listings
    query.status = status && ['Active', 'Mated', 'Paused'].includes(status)
      ? status
      : 'Active';

    if (species) query.species = species;
    if (breed) query.breed = { $regex: breed, $options: 'i' };
    if (gender) query.gender = gender;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (district) query.district = { $regex: district, $options: 'i' };

    // Filter listings that have a breeder license linked
    if (hasLicense === 'true') {
      query.breederLicense = { $ne: null };
    }

    if (search) {
      query.$or = [
        { petName: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } },
        { pedigreeDetails: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await BreedingListing.countDocuments(query);
    const listings = await BreedingListing.find(query)
      .select('-inquiries')  // Hide inquiries in list view
      .populate('owner', 'fullName phone')
      .populate('breederLicense', 'licenseId breederName status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json({
      listings,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit))
    });
  } catch (error) {
    console.error('Get breeding listings error:', error);
    return res.status(500).json({ message: 'Server error while fetching breeding listings' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Get a single breeding listing by ID
// @route   GET /api/breeding-matches/:id
// @access  Public
// ────────────────────────────────────────────────────────────────────────────
exports.getListingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Breeding listing not found' });
    }
    const listing = await BreedingListing.findById(req.params.id)
      .populate('owner', 'fullName phone')
      .populate('breederLicense', 'licenseId breederName animalTypes status issueDate expiryDate')
      .populate('inquiries.inquirer', 'fullName email');

    if (!listing) {
      return res.status(404).json({ message: 'Breeding listing not found' });
    }

    // Increment view count (fire and forget)
    BreedingListing.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();

    // Enquirers' details are for the owner and administrators only
    const data = listing.toObject();
    const canSeeInquiries = req.user && (req.user.isAdmin || String(listing.owner?._id) === String(req.user._id));
    if (!canSeeInquiries) {
      data.inquiryCount = (data.inquiries || []).length;
      delete data.inquiries;
    }
    return res.json({ listing: data });
  } catch (error) {
    console.error('Get breeding listing error:', error);
    return res.status(500).json({ message: 'Server error while fetching breeding listing' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Update a breeding listing (owner only)
// @route   PUT /api/breeding-matches/:id
// @access  Private (auth, owner)
// ────────────────────────────────────────────────────────────────────────────
exports.updateListing = async (req, res) => {
  try {
    const listing = await BreedingListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Breeding listing not found' });
    }

    if (listing.owner.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this listing' });
    }

    const allowedUpdates = [
      'petName', 'species', 'breed', 'gender', 'age', 'photos',
      'pedigreeDetails', 'breederLicense', 'healthClearances',
      'studTerms', 'city', 'district', 'status'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    await listing.save();
    await listing.populate([
      { path: 'owner', select: 'fullName email phone' },
      { path: 'breederLicense', select: 'licenseId breederName status' }
    ]);

    return res.json({ message: 'Breeding listing updated successfully', listing });
  } catch (error) {
    console.error('Update breeding listing error:', error);
    return res.status(500).json({ message: 'Server error while updating breeding listing' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Delete a breeding listing (owner or admin)
// @route   DELETE /api/breeding-matches/:id
// @access  Private (auth, owner or admin)
// ────────────────────────────────────────────────────────────────────────────
exports.deleteListing = async (req, res) => {
  try {
    const listing = await BreedingListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Breeding listing not found' });
    }

    if (listing.owner.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await BreedingListing.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Breeding listing deleted successfully' });
  } catch (error) {
    console.error('Delete breeding listing error:', error);
    return res.status(500).json({ message: 'Server error while deleting breeding listing' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Send a contact inquiry to a breeder
// @route   POST /api/breeding-matches/:id/contact
// @access  Private (auth)
// ────────────────────────────────────────────────────────────────────────────
exports.contactBreeder = async (req, res) => {
  try {
    const listing = await BreedingListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Breeding listing not found' });
    }

    if (listing.status !== 'Active') {
      return res.status(400).json({ message: 'This breeding listing is not currently active' });
    }

    // Prevent owner from contacting themselves
    if (listing.owner.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot contact yourself on your own listing' });
    }

    listing.inquiries.push({
      inquirer: req.user.id,
      message: req.body.message || '',
      contactPhone: req.body.contactPhone || '',
      petName: req.body.petName || '',
      petBreed: req.body.petBreed || ''
    });

    await listing.save();
    return res.status(201).json({ message: 'Inquiry sent to breeder successfully' });
  } catch (error) {
    console.error('Contact breeder error:', error);
    return res.status(500).json({ message: 'Server error while sending inquiry' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Get my breeding listings
// @route   GET /api/breeding-matches/my-listings
// @access  Private (auth)
// ────────────────────────────────────────────────────────────────────────────
exports.getMyListings = async (req, res) => {
  try {
    const listings = await BreedingListing.find({ owner: req.user.id })
      .populate('breederLicense', 'licenseId breederName status')
      .sort({ createdAt: -1 });

    return res.json({ listings, count: listings.length });
  } catch (error) {
    console.error('Get my breeding listings error:', error);
    return res.status(500).json({ message: 'Server error while fetching your listings' });
  }
};
