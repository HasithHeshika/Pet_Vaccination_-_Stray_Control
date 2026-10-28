const AdoptionListing = require('../models/AdoptionListing');

// ────────────────────────────────────────────────────────────────────────────
// Helper — strip sensitive application data when returning public listings
// ────────────────────────────────────────────────────────────────────────────
const publicListingFields = '-applications';

// ────────────────────────────────────────────────────────────────────────────
// @desc    Create a new adoption listing
// @route   POST /api/adoptions
// @access  Private (auth)
// ────────────────────────────────────────────────────────────────────────────
exports.createListing = async (req, res) => {
  try {
    const {
      petName, species, breed, age, gender, photos,
      description, healthRecords, isSpayedOrNeutered, isVaccinated,
      isFree, rehomingFee, city, district, location
    } = req.body;

    const listing = new AdoptionListing({
      petName,
      species,
      breed,
      age,
      gender,
      photos: photos || [],
      description,
      healthRecords: healthRecords || [],
      isSpayedOrNeutered: isSpayedOrNeutered || false,
      isVaccinated: isVaccinated || false,
      isFree: isFree !== undefined ? isFree : true,
      rehomingFee: rehomingFee || 0,
      city,
      district,
      location,
      listedBy: req.user.id
    });

    await listing.save();
    await listing.populate('listedBy', 'fullName email phone');

    return res.status(201).json({
      message: 'Adoption listing created successfully',
      listing
    });
  } catch (error) {
    console.error('Create adoption listing error:', error);
    return res.status(500).json({ message: 'Server error while creating adoption listing' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Get all adoption listings with optional filters
// @route   GET /api/adoptions
// @access  Public
// ────────────────────────────────────────────────────────────────────────────
exports.getAllListings = async (req, res) => {
  try {
    const { species, city, district, gender, isFree, search, status, page = 1, limit = 20 } = req.query;

    const query = {};

    // Default to Available unless explicitly requested
    query.status = status && ['Available', 'Pending', 'Adopted', 'Cancelled'].includes(status)
      ? status
      : 'Available';

    if (species) query.species = species;
    if (city) query.city = { $regex: city, $options: 'i' };
    if (district) query.district = { $regex: district, $options: 'i' };
    if (gender) query.gender = gender;
    if (isFree !== undefined) query.isFree = isFree === 'true';

    if (search) {
      query.$or = [
        { petName: { $regex: search, $options: 'i' } },
        { breed: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await AdoptionListing.countDocuments(query);
    const listings = await AdoptionListing.find(query)
      .select(publicListingFields)
      .populate('listedBy', 'fullName email phone')
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
    console.error('Get adoption listings error:', error);
    return res.status(500).json({ message: 'Server error while fetching adoption listings' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Get a single adoption listing by ID
// @route   GET /api/adoptions/:id
// @access  Public
// ────────────────────────────────────────────────────────────────────────────
exports.getListingById = async (req, res) => {
  try {
    const listing = await AdoptionListing.findById(req.params.id)
      .populate('listedBy', 'fullName email phone')
      .populate('applications.applicant', 'fullName email');

    if (!listing) {
      return res.status(404).json({ message: 'Adoption listing not found' });
    }

    // Increment view count (fire and forget)
    AdoptionListing.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } }).exec();

    return res.json({ listing });
  } catch (error) {
    console.error('Get adoption listing error:', error);
    return res.status(500).json({ message: 'Server error while fetching adoption listing' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Update an adoption listing (owner only)
// @route   PUT /api/adoptions/:id
// @access  Private (auth, owner)
// ────────────────────────────────────────────────────────────────────────────
exports.updateListing = async (req, res) => {
  try {
    const listing = await AdoptionListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Adoption listing not found' });
    }

    // Only the listing owner or an admin can update
    if (listing.listedBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this listing' });
    }

    const allowedUpdates = [
      'petName', 'species', 'breed', 'age', 'gender', 'photos',
      'description', 'healthRecords', 'isSpayedOrNeutered', 'isVaccinated',
      'isFree', 'rehomingFee', 'city', 'district', 'location'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        listing[field] = req.body[field];
      }
    });

    await listing.save();
    await listing.populate('listedBy', 'fullName email phone');

    return res.json({ message: 'Adoption listing updated successfully', listing });
  } catch (error) {
    console.error('Update adoption listing error:', error);
    return res.status(500).json({ message: 'Server error while updating adoption listing' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Delete an adoption listing (owner or admin)
// @route   DELETE /api/adoptions/:id
// @access  Private (auth, owner or admin)
// ────────────────────────────────────────────────────────────────────────────
exports.deleteListing = async (req, res) => {
  try {
    const listing = await AdoptionListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Adoption listing not found' });
    }

    if (listing.listedBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this listing' });
    }

    await AdoptionListing.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Adoption listing deleted successfully' });
  } catch (error) {
    console.error('Delete adoption listing error:', error);
    return res.status(500).json({ message: 'Server error while deleting adoption listing' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Submit an adoption inquiry/application
// @route   POST /api/adoptions/:id/inquire
// @access  Private (auth)
// ────────────────────────────────────────────────────────────────────────────
exports.applyForAdoption = async (req, res) => {
  try {
    const listing = await AdoptionListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Adoption listing not found' });
    }

    if (listing.status !== 'Available') {
      return res.status(400).json({ message: 'This pet is no longer available for adoption' });
    }

    // Prevent the owner from applying to their own listing
    if (listing.listedBy.toString() === req.user.id) {
      return res.status(400).json({ message: 'You cannot apply to adopt your own pet' });
    }

    // Prevent duplicate application
    const alreadyApplied = listing.applications.some(
      app => app.applicant.toString() === req.user.id
    );
    if (alreadyApplied) {
      return res.status(400).json({ message: 'You have already submitted an inquiry for this pet' });
    }

    listing.applications.push({
      applicant: req.user.id,
      message: req.body.message || '',
      contactPhone: req.body.contactPhone || ''
    });

    await listing.save();
    return res.status(201).json({ message: 'Adoption inquiry submitted successfully' });
  } catch (error) {
    console.error('Apply for adoption error:', error);
    return res.status(500).json({ message: 'Server error while submitting adoption inquiry' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Update listing status (owner marks Pending/Adopted/Cancelled)
// @route   PATCH /api/adoptions/:id/status
// @access  Private (auth, owner)
// ────────────────────────────────────────────────────────────────────────────
exports.updateListingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Available', 'Pending', 'Adopted', 'Cancelled'];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const listing = await AdoptionListing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ message: 'Adoption listing not found' });
    }

    if (listing.listedBy.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this listing status' });
    }

    listing.status = status;
    await listing.save();

    return res.json({ message: `Listing status updated to ${status}`, listing });
  } catch (error) {
    console.error('Update listing status error:', error);
    return res.status(500).json({ message: 'Server error while updating listing status' });
  }
};

// ────────────────────────────────────────────────────────────────────────────
// @desc    Get my listings (listings created by the authenticated user)
// @route   GET /api/adoptions/my-listings
// @access  Private (auth)
// ────────────────────────────────────────────────────────────────────────────
exports.getMyListings = async (req, res) => {
  try {
    const listings = await AdoptionListing.find({ listedBy: req.user.id })
      .sort({ createdAt: -1 });

    return res.json({ listings, count: listings.length });
  } catch (error) {
    console.error('Get my adoption listings error:', error);
    return res.status(500).json({ message: 'Server error while fetching your listings' });
  }
};
