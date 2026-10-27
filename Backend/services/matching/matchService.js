const LostReport = require('../../models/LostReport');
const Pet = require('../../models/Pet');
const PetMatch = require('../../models/PetMatch');
const { getProvider } = require('./aiProviders');

// Matching limits (overridable per environment)
const MAX_KM = () => Number(process.env.MATCH_MAX_KM) || 15;
const MAX_DAYS = () => Number(process.env.MATCH_MAX_DAYS) || 30;
const MIN_SCORE = () => Number(process.env.MATCH_MIN_SCORE) || 40;
const MAX_SUGGESTIONS_PER_FOUND = 5;
// A pet can be reported lost a little after it was actually found (owner noticed late)
const LOST_AFTER_FOUND_GRACE_DAYS = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

const UNKNOWN_WORDS = new Set(['', 'unknown', 'not sure', 'unsure', 'n/a', 'na', 'none', '-']);
const COLOUR_STOPWORDS = new Set(['and', 'with', 'a', 'the', 'colour', 'color', 'light', 'dark', 'mixed']);

const clean = (value) => String(value || '').trim().toLowerCase();
const isUnknown = (value) => UNKNOWN_WORDS.has(clean(value));

// ---- Field readers (reports and registered pets store things slightly differently) ----
const speciesOfReport = (r) => (r.species === 'Other' ? r.speciesOther : r.species);
const speciesOfPet = (p) => (p.petType === 'Other' ? p.petTypeOther : p.petType);
const breedOf = (x) => (x.breed === 'Other' ? x.breedOther : x.breed);
const imagesOfReport = (r) => [...(r.images || []), ...(r.imageUrl ? [r.imageUrl] : [])];
const imagesOfPet = (p) => (p.photoUrls && p.photoUrls.length ? p.photoUrls : (p.photoUrl ? [p.photoUrl] : []));

const hasCoords = (r) => r?.coordinates && Number.isFinite(r.coordinates.lat) && Number.isFinite(r.coordinates.lng);

const haversineKm = (a, b) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const speciesCompatible = (a, b) => isUnknown(a) || isUnknown(b) || clean(a) === clean(b);

// ---- Scoring ----
const scoreSpecies = (a, b) => (isUnknown(a) || isUnknown(b) ? 10 : (clean(a) === clean(b) ? 25 : 0));

const scoreBreed = (a, b) => {
  if (isUnknown(a) || isUnknown(b)) return 8;
  const x = clean(a).replace(/[^a-z ]/g, '').trim();
  const y = clean(b).replace(/[^a-z ]/g, '').trim();
  // No letters left (e.g. "123"): as good as unknown, and "" would otherwise be "part of" every breed
  if (!x || !y) return 8;
  if (x === y) return 25;
  // Partial names ("Labrador" vs "Labrador Retriever"), but not single letters or fragments
  if (Math.min(x.length, y.length) >= 3 && (x.includes(y) || y.includes(x))) return 18;
  return 0;
};

const colourWords = (value) => new Set(
  clean(value).split(/[^a-z]+/).filter((w) => w && !COLOUR_STOPWORDS.has(w))
);

const scoreColour = (a, b) => {
  if (isUnknown(a) || isUnknown(b)) return 5;
  const x = colourWords(a);
  const y = colourWords(b);
  if (!x.size || !y.size) return 5;
  const shared = [...x].filter((w) => y.has(w)).length;
  const union = new Set([...x, ...y]).size;
  return Math.round((shared / union) * 20);
};

const scoreDistance = (km) => {
  if (km === null) return 5; // unknown: neutral
  if (km <= 1) return 15;
  if (km <= 5) return 11;
  if (km <= 10) return 7;
  return 3;
};

const scoreTime = (days) => {
  if (days === null) return 5; // unknown: neutral
  if (days <= 1) return 15;
  if (days <= 3) return 12;
  if (days <= 7) return 9;
  if (days <= 14) return 6;
  return 3;
};

// Score a found report against a lost report
const scoreAgainstLost = (found, lost) => {
  const distanceKm = hasCoords(found) && hasCoords(lost) ? haversineKm(found.coordinates, lost.coordinates) : null;
  const daysApart = Math.abs(new Date(found.lastSeenDate) - new Date(lost.lastSeenDate)) / DAY_MS;
  const breakdown = {
    species: scoreSpecies(speciesOfReport(found), speciesOfReport(lost)),
    breed: scoreBreed(breedOf(found), breedOf(lost)),
    colour: scoreColour(found.color, lost.color),
    distance: scoreDistance(distanceKm),
    time: scoreTime(daysApart),
    distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
    daysApart: Math.round(daysApart * 10) / 10,
    tagMatch: false
  };
  const score = breakdown.species + breakdown.breed + breakdown.colour + breakdown.distance + breakdown.time;
  return { score: Math.min(100, score), breakdown };
};

// Score a found report against a registered pet (no location or date on the pet)
const scoreAgainstPet = (found, pet) => {
  const tagMatch = Boolean(found.tagPetId) && clean(found.tagPetId) === clean(pet.petId);
  const breakdown = {
    species: scoreSpecies(speciesOfReport(found), speciesOfPet(pet)),
    breed: scoreBreed(breedOf(found), breedOf(pet)),
    colour: scoreColour(found.color, pet.color),
    distance: scoreDistance(null),
    time: scoreTime(null),
    distanceKm: null,
    daysApart: null,
    tagMatch
  };
  const score = tagMatch
    ? 100
    : breakdown.species + breakdown.breed + breakdown.colour + breakdown.distance + breakdown.time;
  return { score: Math.min(100, score), breakdown };
};

// ---- Candidate filters ----
const lostReportPassesFilters = (found, lost) => {
  if (String(lost.reportedBy) === String(found.reportedBy)) return false; // nobody finds their own lost pet
  if (!speciesCompatible(speciesOfReport(found), speciesOfReport(lost))) return false;
  const foundAt = new Date(found.lastSeenDate).getTime();
  const lostAt = new Date(lost.lastSeenDate).getTime();
  if (lostAt > foundAt + LOST_AFTER_FOUND_GRACE_DAYS * DAY_MS) return false;
  if (lostAt < foundAt - MAX_DAYS() * DAY_MS) return false;
  if (hasCoords(found) && hasCoords(lost) && haversineKm(found.coordinates, lost.coordinates) > MAX_KM()) return false;
  return true;
};

const petPassesFilters = (found, pet) => {
  if (String(pet.owner) === String(found.reportedBy)) return false;
  if (found.tagPetId && clean(found.tagPetId) === clean(pet.petId)) return true;
  return speciesCompatible(speciesOfReport(found), speciesOfPet(pet));
};

const LIGHT_FIELDS = '-images -imageUrl';
const PET_FIELDS = 'petId petName petType petTypeOther breed breedOther color owner';

// All scored candidates for one found report, best first
const scoreCandidates = async (found) => {
  const lostReports = await LostReport.find({ reportType: 'lost', status: 'Lost' }).select(LIGHT_FIELDS);
  const pets = await Pet.find({}).select(PET_FIELDS);

  const scored = [];
  const linkedPetIds = new Set();

  for (const lost of lostReports) {
    if (!lostReportPassesFilters(found, lost)) continue;
    const { score, breakdown } = scoreAgainstLost(found, lost);
    scored.push({ candidateType: 'lost_report', lostReport: lost._id, registeredPet: null, score, breakdown });
    if (lost.linkedPet) linkedPetIds.add(String(lost.linkedPet));
  }

  for (const pet of pets) {
    // A pet already covered by its own lost report is suggested once, through that report
    if (linkedPetIds.has(String(pet._id))) continue;
    if (!petPassesFilters(found, pet)) continue;
    const { score, breakdown } = scoreAgainstPet(found, pet);
    scored.push({ candidateType: 'registered_pet', lostReport: null, registeredPet: pet._id, score, breakdown });
  }

  return scored.sort((a, b) => b.score - a.score);
};

// Ask the configured AI provider about a suggestion (no-op with the "none" provider)
const runAiCheck = async (match) => {
  const provider = getProvider();
  try {
    const populated = await PetMatch.findById(match._id)
      .populate('foundReport')
      .populate('lostReport')
      .populate('registeredPet');
    if (!populated) return;
    const candidate = populated.candidateType === 'lost_report' ? populated.lostReport : populated.registeredPet;
    const found = populated.foundReport.toObject();
    const candidateObj = candidate.toObject();
    found.photos = imagesOfReport(found);
    candidateObj.photos = populated.candidateType === 'lost_report' ? imagesOfReport(candidateObj) : imagesOfPet(candidateObj);

    const result = await provider.compare({ found, candidate: candidateObj, candidateType: populated.candidateType });
    match.ai = {
      provider: provider.name,
      model: result.model,
      verdict: result.verdict ?? null,
      score: result.score ?? null,
      reasons: result.reasons || [],
      checkedAt: new Date(),
      error: undefined
    };
  } catch (error) {
    match.ai = { provider: provider.name, verdict: null, reasons: [], checkedAt: new Date(), error: error.message };
  }
  await match.save();
};

// Recompute the suggestions for one found report. Confirmed/rejected decisions are never touched.
const syncFoundReport = async (found) => {
  const reviewed = await PetMatch.find({ foundReport: found._id, status: { $ne: 'suggested' } })
    .select('lostReport registeredPet');
  const reviewedKeys = new Set(reviewed.map((m) => `${m.lostReport || ''}|${m.registeredPet || ''}`));

  const isOpen = found.reportType === 'found' && found.status === 'Found';
  const candidates = isOpen
    ? (await scoreCandidates(found))
      .filter((c) => c.score >= MIN_SCORE())
      .filter((c) => !reviewedKeys.has(`${c.lostReport || ''}|${c.registeredPet || ''}`))
      .slice(0, MAX_SUGGESTIONS_PER_FOUND)
    : [];

  const keep = [];
  for (const c of candidates) {
    const filter = { foundReport: found._id, lostReport: c.lostReport, registeredPet: c.registeredPet };
    let match = await PetMatch.findOne(filter);
    const isNew = !match;
    const scoreChanged = match && match.score !== c.score;
    if (!match) match = new PetMatch({ ...filter, candidateType: c.candidateType });
    match.score = c.score;
    match.breakdown = c.breakdown;
    try {
      await match.save();
    } catch (error) {
      // Another matching run created the same suggestion at the same moment
      if (error.code !== 11000) throw error;
      match = await PetMatch.findOne(filter);
      if (!match) continue;
    }
    keep.push(match._id);
    if (isNew || scoreChanged || !match.ai?.checkedAt) {
      await runAiCheck(match);
    }
  }

  // Drop suggestions that no longer qualify (report closed, details edited, better candidates)
  await PetMatch.deleteMany({ foundReport: found._id, status: 'suggested', _id: { $nin: keep } });
  return keep.length;
};

// Found reports that could be affected by a change to a lost report or a registered pet
const openFoundReports = () => LostReport.find({ reportType: 'found', status: 'Found' }).select(LIGHT_FIELDS);

const syncForLostReport = async (lost) => {
  const affected = new Map();
  const existing = await PetMatch.find({ lostReport: lost._id, status: 'suggested' }).select('foundReport');
  existing.forEach((m) => affected.set(String(m.foundReport), true));
  if (lost.status === 'Lost') {
    for (const found of await openFoundReports()) {
      if (lostReportPassesFilters(found, lost)) affected.set(String(found._id), true);
    }
  }
  for (const id of affected.keys()) {
    const found = await LostReport.findById(id).select(LIGHT_FIELDS);
    if (found) await syncFoundReport(found);
  }
  return affected.size;
};

const syncForPet = async (pet) => {
  let count = 0;
  for (const found of await openFoundReports()) {
    if (petPassesFilters(found, pet)) {
      await syncFoundReport(found);
      count += 1;
    }
  }
  return count;
};

// Entry points -------------------------------------------------------------

// Recompute matches after a lost or found report is created or changed. Returns the number of
// found reports re-evaluated.
const runMatchingForReport = async (reportOrId) => {
  const report = typeof reportOrId === 'object' && reportOrId._id
    ? reportOrId
    : await LostReport.findById(reportOrId).select(LIGHT_FIELDS);
  if (!report) return 0;
  if (report.reportType === 'found') {
    await syncFoundReport(report);
    return 1;
  }
  return syncForLostReport(report);
};

const runMatchingForPet = async (petOrId) => {
  const pet = typeof petOrId === 'object' && petOrId._id ? petOrId : await Pet.findById(petOrId).select(PET_FIELDS);
  if (!pet) return 0;
  return syncForPet(pet);
};

// Fire-and-forget wrappers for request handlers: matching never slows down or fails a request
const queueMatchingForReport = (report) => {
  runMatchingForReport(report).catch((error) => console.error('Matching error (report):', error));
};
const queueMatchingForPet = (pet) => {
  runMatchingForPet(pet).catch((error) => console.error('Matching error (pet):', error));
};

module.exports = {
  runMatchingForReport,
  runMatchingForPet,
  queueMatchingForReport,
  queueMatchingForPet,
  // exported for tests and the admin view
  scoreAgainstLost,
  scoreAgainstPet,
  imagesOfReport,
  imagesOfPet,
  haversineKm
};
