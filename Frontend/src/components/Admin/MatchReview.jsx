import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import { formatDate } from '../../utils/dateFormat';
import { isSafeImageSrc } from '../../utils/lostFound';
import { mapLink } from '../../utils/incidents';
import './AdminDashboard.css';

const STATUS_TABS = [
  { key: 'suggested', label: 'To review' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'rejected', label: 'Rejected' }
];

const scoreClass = (score) => (score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low');

// One side of a match: the found report, or the lost report / registered pet it may be
const MatchSide = ({ title, side, isPet }) => {
  if (!side) return null;
  const photos = (side.images || []).filter(isSafeImageSrc);
  const link = mapLink(side.coordinates);
  return (
    <div className="match-side">
      <p className="authority-eyebrow">{title}</p>
      <div className="match-photos">
        {photos.length === 0 ? (
          <div className="match-photo-placeholder">No photo</div>
        ) : photos.map((photo, index) => (
          <img key={index} src={photo} alt={`${title} ${index + 1}`} />
        ))}
      </div>
      <h3>{side.petName && side.petName !== 'Unknown' ? side.petName : 'Unknown name'}</h3>
      <dl className="match-facts">
        {isPet && <><dt>Pet ID</dt><dd>{side.petId}</dd></>}
        <dt>Species</dt><dd>{side.species || '—'}</dd>
        <dt>Breed</dt><dd>{side.breed || '—'}</dd>
        <dt>Colour</dt><dd>{side.color || '—'}</dd>
        {!isPet && (
          <>
            <dt>{side.reportType === 'found' ? 'Found at' : 'Last seen'}</dt>
            <dd>
              {side.location}
              {link && <> (<a href={link} target="_blank" rel="noopener noreferrer">map</a>)</>}
            </dd>
            <dt>Date</dt><dd>{formatDate(side.date)}</dd>
            {side.tagPetId && <><dt>Tag Pet ID</dt><dd>{side.tagPetId}</dd></>}
            <dt>Reporter</dt><dd>{side.reporterName || '—'}</dd>
            <dt>Contact</dt><dd>{side.contactInfo}</dd>
          </>
        )}
        {isPet && side.ownerName && <><dt>Owner</dt><dd>{side.ownerName}</dd></>}
      </dl>
      {side.description && <p className="match-description">{side.description}</p>}
    </div>
  );
};

const Breakdown = ({ breakdown }) => {
  if (!breakdown) return null;
  if (breakdown.tagMatch) return <p className="match-breakdown"><strong>QR tag Pet ID matches this registered pet.</strong></p>;
  const parts = [
    ['Species', breakdown.species, 25],
    ['Breed', breakdown.breed, 25],
    ['Colour', breakdown.colour, 20],
    ['Distance', breakdown.distance, 15],
    ['Time', breakdown.time, 15]
  ];
  return (
    <div className="match-breakdown">
      {parts.map(([label, value, max]) => (
        <span key={label}>{label} {value ?? 0}/{max}</span>
      ))}
      {breakdown.distanceKm !== null && breakdown.distanceKm !== undefined && <span>{breakdown.distanceKm} km apart</span>}
      {breakdown.daysApart !== null && breakdown.daysApart !== undefined && <span>{breakdown.daysApart} days apart</span>}
    </div>
  );
};

const AiPanel = ({ ai }) => (
  <div className="match-ai">
    <strong>AI image analysis:</strong>{' '}
    {!ai || ai.provider === 'none' || (!ai.verdict && !ai.error)
      ? <span>not configured yet. This suggestion is based on the report details (species, breed, colour, place and time).</span>
      : ai.error
        ? <span>failed ({ai.error})</span>
        : (
          <>
            <span className={`match-ai-verdict ${ai.verdict}`}>{ai.verdict}</span>
            {ai.score !== null && ai.score !== undefined && <span> · {ai.score}%</span>}
            {ai.reasons?.length > 0 && <ul>{ai.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
          </>
        )}
  </div>
);

// Administrator review of possible Lost & Found matches. Nobody is notified until a match is confirmed.
const MatchReview = () => {
  const [status, setStatus] = useState('suggested');
  const [matches, setMatches] = useState([]);
  const [counts, setCounts] = useState({});
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const res = await axios.get('/api/matches', { params: { status } });
      setMatches(res.data.matches || []);
      setCounts(res.data.counts || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    setDetails({});
    load();
  }, [load]);

  const loadDetail = async (id) => {
    try {
      const res = await axios.get(`/api/matches/${id}`);
      setDetails((current) => ({ ...current, [id]: res.data.match }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load the match');
    }
  };

  const decide = async (match, decision) => {
    const note = window.prompt(
      decision === 'confirm'
        ? 'Optional note for the owner and finder (e.g. what makes you think it is the same animal):'
        : 'Optional reason for rejecting (kept for the record):',
      ''
    );
    if (note === null) return;
    try {
      setBusyId(match._id);
      setMessage('');
      const res = await axios.patch(`/api/matches/${match._id}`, { decision, note });
      setMessage(res.data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save the decision');
    } finally {
      setBusyId('');
    }
  };

  const rerun = async (reportId) => {
    try {
      setMessage('');
      const res = await axios.post(`/api/matches/rerun/${reportId}`);
      setMessage(res.data.message);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to re-run matching');
    }
  };

  return (
    <div className="dashboard authority-dashboard">
      <section className="authority-hero">
        <div>
          <p className="authority-eyebrow">Lost &amp; Found</p>
          <h1>Possible Matches</h1>
          <p>
            The system compares every found pet with missing pets and registered pets. Check each suggestion;
            the owner and finder are only told after you confirm it.
          </p>
        </div>
        <div className="authority-hero-actions">
          <Link to="/lost-and-found" className="btn btn-secondary">Lost &amp; Found feed</Link>
          <Link to="/admin/authority" className="btn btn-secondary">Authority dashboard</Link>
        </div>
      </section>

      <div className="authority-filter" style={{ marginBottom: 16 }}>
        {STATUS_TABS.map((tab) => (
          <button key={tab.key} type="button" className={status === tab.key ? 'active' : ''} onClick={() => setStatus(tab.key)}>
            {tab.label} ({counts[tab.key] || 0})
          </button>
        ))}
      </div>

      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      {loading && <div className="loading">Loading matches...</div>}

      {!loading && matches.length === 0 && (
        <p className="authority-empty">
          {status === 'suggested' ? 'No possible matches waiting for review.' : `No ${status} matches.`}
        </p>
      )}

      {!loading && matches.map((summary) => {
        const match = details[summary._id] || summary;
        const isFull = Boolean(details[summary._id]);
        const candidate = match.lost || match.pet;
        return (
          <article key={match._id} className="authority-card match-card-admin">
            <div className="authority-section-header">
              <div>
                <span className={`match-score ${scoreClass(match.score)}`}>{match.score}% match</span>
                <span className="match-type">
                  {match.candidateType === 'registered_pet' ? 'Found pet vs registered pet' : 'Found pet vs lost report'}
                </span>
              </div>
              <span className="match-date">Suggested {formatDate(match.createdAt)}</span>
            </div>

            <div className="match-sides">
              <MatchSide title="Found pet" side={match.found} />
              <MatchSide title={match.pet ? 'Registered pet' : 'Lost pet'} side={candidate} isPet={Boolean(match.pet)} />
            </div>

            <Breakdown breakdown={match.breakdown} />
            <AiPanel ai={match.ai} />
            {match.reviewNote && <p className="match-note"><strong>Review note:</strong> {match.reviewNote}</p>}

            <div className="match-actions">
              {!isFull && (match.found?.imageCount > 1 || (match.lost?.imageCount ?? 0) > 1) && (
                <button type="button" className="btn btn-secondary btn-small" onClick={() => loadDetail(match._id)}>Show all photos</button>
              )}
              {match.status === 'suggested' && (
                <>
                  <button type="button" className="btn btn-secondary btn-small" onClick={() => rerun(match.found._id)}>Re-run matching</button>
                  <button type="button" className="btn btn-danger btn-small" disabled={busyId === match._id} onClick={() => decide(match, 'reject')}>Not the same pet</button>
                  <button type="button" className="btn btn-primary btn-small" disabled={busyId === match._id} onClick={() => decide(match, 'confirm')}>Confirm &amp; notify</button>
                </>
              )}
              {match.status !== 'suggested' && (
                <span className="match-reviewed">
                  {match.status === 'confirmed' ? 'Confirmed' : 'Rejected'} on {formatDate(match.reviewedAt)}
                  {match.status === 'confirmed' && (match.notifiedAt ? ' · owner and finder emailed' : ' · email not sent; visible in the app')}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default MatchReview;
