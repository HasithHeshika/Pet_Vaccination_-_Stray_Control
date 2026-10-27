const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const validateObjectId = require('../middleware/validateObjectId');
const PetMatch = require('../models/PetMatch');
const LostReport = require('../models/LostReport');
const Pet = require('../models/Pet');
const User = require('../models/User');
const { runMatchingForReport, imagesOfReport, imagesOfPet } = require('../services/matching/matchService');
const { sendPetMatchEmail } = require('../services/notificationService');
const { getFrontendUrl } = require('../utils/frontendUrl');

// ---- Shapes sent to the clients ----
const reportView = (r, { withImages = true, withContact = true } = {}) => r && ({
  _id: r._id,
  reportType: r.reportType || 'lost',
  petName: r.petName,
  species: r.species === 'Other' ? r.speciesOther || 'Other' : r.species,
  breed: r.breed,
  color: r.color,
  location: r.lastSeenLocation,
  date: r.lastSeenDate,
  coordinates: r.coordinates,
  description: r.description,
  tagPetId: r.tagPetId,
  status: r.status,
  imageCount: r.imageCount,
  ...(withImages ? { images: imagesOfReport(r) } : {}),
  ...(withContact ? { contactInfo: r.contactInfo } : {}),
  reporterName: r.reportedBy?.fullName
});

const petView = (p, { withImages = true, withOwner = true } = {}) => p && ({
  _id: p._id,
  petId: p.petId,
  petName: p.petName,
  species: p.petType === 'Other' ? p.petTypeOther || 'Other' : p.petType,
  breed: p.breed === 'Other' ? p.breedOther || 'Other' : p.breed,
  color: p.color,
  ...(withImages ? { images: imagesOfPet(p) } : {}),
  ...(withOwner && p.owner?.fullName ? { ownerName: p.owner.fullName } : {})
});

const matchView = (m, options = {}) => ({
  _id: m._id,
  status: m.status,
  candidateType: m.candidateType,
  score: m.score,
  breakdown: m.breakdown,
  ai: m.ai,
  reviewNote: m.reviewNote,
  reviewedAt: m.reviewedAt,
  notifiedAt: m.notifiedAt,
  createdAt: m.createdAt,
  found: reportView(m.foundReport, options),
  lost: reportView(m.lostReport, options),
  pet: petView(m.registeredPet, options)
});

const populateSides = (query) => query
  .populate({ path: 'foundReport', populate: { path: 'reportedBy', select: 'fullName email' } })
  .populate({ path: 'lostReport', populate: { path: 'reportedBy', select: 'fullName email' } })
  .populate({ path: 'registeredPet', populate: { path: 'owner', select: 'fullName email' } });

const formatDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const describe = (r) => [r.species, r.breed, r.color].filter((v) => v && v !== 'Unknown').join(', ') || 'animal';

// ---- Owner / finder: confirmed matches involving me ----

// @route   GET /api/matches/mine
// @desc    Confirmed matches for the current user's lost or found reports and registered pets
// @access  Private
router.get('/mine', auth, async (req, res) => {
  try {
    const [myReports, myPets] = await Promise.all([
      LostReport.find({ reportedBy: req.user._id }).select('_id'),
      Pet.find({ owner: req.user._id }).select('_id')
    ]);
    const reportIds = myReports.map((r) => r._id);
    const petIds = myPets.map((p) => p._id);

    const matches = await populateSides(PetMatch.find({
      status: 'confirmed',
      $or: [{ foundReport: { $in: reportIds } }, { lostReport: { $in: reportIds } }, { registeredPet: { $in: petIds } }]
    }).sort({ reviewedAt: -1 }));

    const me = req.user._id.toString();
    res.json({
      matches: matches.map((m) => {
        const iAmFinder = m.foundReport?.reportedBy?._id?.toString() === me;
        return {
          _id: m._id,
          role: iAmFinder ? 'finder' : 'owner',
          reviewNote: m.reviewNote,
          reviewedAt: m.reviewedAt,
          candidateType: m.candidateType,
          // Owners see the finder's report (with the finder's chosen contact details).
          // Finders see the lost report, or only the registered pet's description (never the owner's details).
          myReport: iAmFinder ? reportView(m.foundReport) : (m.lostReport ? reportView(m.lostReport) : null),
          myPet: !iAmFinder && m.registeredPet ? petView(m.registeredPet, { withOwner: false }) : null,
          other: iAmFinder
            ? (m.lostReport ? reportView(m.lostReport) : { ...petView(m.registeredPet, { withOwner: false }), ownerNotified: true })
            : reportView(m.foundReport)
        };
      })
    });
  } catch (error) {
    console.error('My matches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---- Administrator review ----

// @route   GET /api/matches?status=suggested|confirmed|rejected
// @desc    Matches to review, highest score first (first photo of each side only)
// @access  Private/Admin
router.get('/', auth, admin, async (req, res) => {
  try {
    const status = ['suggested', 'confirmed', 'rejected'].includes(req.query.status) ? req.query.status : 'suggested';
    const matches = await populateSides(PetMatch.find({ status }).sort({ score: -1, createdAt: -1 }).limit(100));
    const counts = await PetMatch.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    res.json({
      matches: matches.map((m) => {
        const view = matchView(m);
        // Lists only need one photo per side: the small preview where there is one
        ['found', 'lost', 'pet'].forEach((side) => {
          if (view[side]?.images) view[side].images = view[side].images.slice(0, 1);
        });
        if (view.found && m.foundReport?.thumbnail) view.found.images = [m.foundReport.thumbnail];
        if (view.lost && m.lostReport?.thumbnail) view.lost.images = [m.lostReport.thumbnail];
        return view;
      }),
      counts: Object.fromEntries(counts.map((c) => [c._id, c.count]))
    });
  } catch (error) {
    console.error('List matches error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/matches/:id
// @desc    One match with both sides in full
// @access  Private/Admin
router.get('/:id', auth, admin, validateObjectId(), async (req, res) => {
  try {
    const match = await populateSides(PetMatch.findById(req.params.id));
    if (!match) return res.status(404).json({ message: 'Match not found' });
    res.json({ match: matchView(match) });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/matches/:id
// @desc    Confirm (notify owner and finder) or reject a suggested match
// @access  Private/Admin
router.patch(
  '/:id',
  auth,
  admin,
  validateObjectId(),
  [
    body('decision').isIn(['confirm', 'reject']).withMessage('Decision must be confirm or reject'),
    body('note').optional().trim().isLength({ max: 500 }).withMessage('Note is too long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

      const match = await populateSides(PetMatch.findById(req.params.id));
      if (!match) return res.status(404).json({ message: 'Match not found' });
      if (match.status !== 'suggested') {
        return res.status(400).json({ message: `This match has already been ${match.status}` });
      }

      match.status = req.body.decision === 'confirm' ? 'confirmed' : 'rejected';
      match.reviewedBy = req.user._id;
      match.reviewedAt = new Date();
      match.reviewNote = req.body.note || undefined;

      if (match.status === 'rejected') {
        await match.save();
        return res.json({ message: 'Match rejected', match: matchView(match) });
      }

      // Confirmed: both reports are now being handled; other suggestions for them are dropped
      const found = match.foundReport;
      const lost = match.lostReport;
      await LostReport.updateMany(
        { _id: { $in: [found._id, ...(lost ? [lost._id] : [])] } },
        { $set: { status: 'In Progress' } }
      );
      await PetMatch.deleteMany({
        _id: { $ne: match._id },
        status: 'suggested',
        $or: [{ foundReport: found._id }, ...(lost ? [{ lostReport: lost._id }] : [])]
      });

      // Notify both sides
      const link = `${getFrontendUrl()}/lost-and-found?tab=matches`;
      const finder = found.reportedBy?._id ? found.reportedBy : await User.findById(found.reportedBy);
      const owner = lost
        ? (lost.reportedBy?._id ? lost.reportedBy : await User.findById(lost.reportedBy))
        : (match.registeredPet?.owner?._id ? match.registeredPet.owner : await User.findById(match.registeredPet?.owner));
      const foundView = reportView(found);
      const results = [];
      if (owner?.email) {
        results.push(await sendPetMatchEmail(owner.email, {
          role: 'owner',
          name: owner.fullName,
          petDescription: lost ? `${lost.petName}, ${describe(reportView(lost))}` : `${match.registeredPet.petName}, Pet ID ${match.registeredPet.petId}`,
          otherContact: found.contactInfo,
          foundLocation: found.lastSeenLocation,
          foundDate: formatDate(found.lastSeenDate),
          reviewNote: match.reviewNote,
          link
        }));
      }
      if (finder?.email) {
        results.push(await sendPetMatchEmail(finder.email, {
          role: 'finder',
          name: finder.fullName,
          petDescription: describe(foundView),
          // A registered pet's owner details are never sent; the owner contacts the finder
          otherContact: lost ? lost.contactInfo : null,
          reviewNote: match.reviewNote,
          link
        }));
      }
      if (results.some((r) => r?.success)) match.notifiedAt = new Date();
      await match.save();

      res.json({
        message: match.notifiedAt
          ? 'Match confirmed; the owner and finder have been emailed'
          : 'Match confirmed (email could not be sent; both users can see it in the app)',
        match: matchView(match)
      });
    } catch (error) {
      console.error('Review match error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// @route   POST /api/matches/rerun/:reportId
// @desc    Run matching again for one lost or found report
// @access  Private/Admin
router.post('/rerun/:reportId', auth, admin, validateObjectId('reportId'), async (req, res) => {
  try {
    const report = await LostReport.findById(req.params.reportId).select('-images -imageUrl');
    if (!report) return res.status(404).json({ message: 'Report not found' });
    const evaluated = await runMatchingForReport(report);
    const suggestions = await PetMatch.countDocuments({
      status: 'suggested',
      $or: [{ foundReport: report._id }, { lostReport: report._id }]
    });
    res.json({ message: `Matching re-run: ${suggestions} suggestion(s)`, evaluated, suggestions });
  } catch (error) {
    console.error('Rerun matching error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
