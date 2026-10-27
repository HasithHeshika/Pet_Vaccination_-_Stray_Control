import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateFormat';
import { reportTypeOf, speciesLabel, firstPhoto, isSafeImageSrc } from '../../utils/lostFound';
import './LostFound.css';

const TABS = [
  { key: 'all', label: 'All Reports' },
  { key: 'lost', label: 'Lost' },
  { key: 'found', label: 'Found' }
];

// Confirmed matches for my lost/found reports and registered pets
const MyMatches = () => {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/matches/mine')
      .then((res) => setMatches(res.data.matches || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load your matches'));
  }, []);

  if (error) return <div className="error-message">{error}</div>;
  if (!matches) return <div className="loading">Loading your matches...</div>;
  if (matches.length === 0) {
    return (
      <p className="no-pets">
        No confirmed matches yet. When the authority confirms that a found pet may be yours (or that the pet you found may have an owner), it will appear here and you will get an email.
      </p>
    );
  }

  return (
    <div className="lost-pets-grid">
      {matches.map((m) => {
        const other = m.other || {};
        const photo = (other.images || []).find(isSafeImageSrc);
        return (
          <div key={m._id} className="lost-pet-card match-card">
            <div className="pet-image-container">
              {photo ? <img src={photo} alt="Matched pet" className="pet-image" /> : <div className="pet-image-placeholder">No Image</div>}
              <span className="lost-found-badge match">Possible match</span>
            </div>
            <div className="pet-info">
              <h3>
                {m.role === 'owner'
                  ? `A pet found on ${formatDate(other.date)} may be ${m.myReport?.petName || m.myPet?.petName || 'yours'}`
                  : 'The pet you found may have an owner'}
              </h3>
              <p><strong>Animal:</strong> {[other.species, other.breed, other.color].filter((v) => v && v !== 'Unknown').join(', ')}</p>
              {other.location && <p><strong>{m.role === 'owner' ? 'Found at' : 'Last seen'}:</strong> {other.location}</p>}
              {other.description && <p className="pet-description">{other.description}</p>}
              {m.reviewNote && <p><strong>Note from the authority:</strong> {m.reviewNote}</p>}
              <div className="contact-info">
                {other.contactInfo
                  ? <><strong>{m.role === 'owner' ? 'Finder' : 'Owner'}:</strong> {other.contactInfo}</>
                  : <>The owner has been given your contact details and will get in touch.</>}
              </div>
              <p className="match-warning">Please make sure it is the same animal before arranging a hand-over.</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const LostFoundFeed = () => {
  const { user, isAdmin, token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tabParam = searchParams.get('tab') || 'all';
  const activeTab = ['all', 'lost', 'found', 'My', 'matches'].includes(tabParam) ? tabParam : 'all';

  const setActiveTab = (tab) => setSearchParams(tab === 'all' ? {} : { tab });

  const fetchReports = useCallback(async () => {
    try {
      const res = await axios.get('/api/lost-and-found');
      setReports(res.data);
      setError(null);
    } catch (err) {
      setError('Could not load Lost & Found reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this report?')) {
      try {
        await axios.delete(`/api/lost-and-found/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        fetchReports();
      } catch (err) {
        alert('Failed to delete report.');
      }
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.patch(`/api/lost-and-found/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  if (loading) return <div className="loading">Loading Lost &amp; Found reports...</div>;

  const isMine = (report) => user && (report.reportedBy?._id === user.id || report.reportedBy === user.id);
  const filteredReports = reports.filter((report) => {
    if (activeTab === 'My') return isMine(report);
    if (activeTab === 'lost' || activeTab === 'found') return reportTypeOf(report) === activeTab;
    return true;
  });

  const tabs = [
    ...TABS,
    ...(user && !isAdmin ? [{ key: 'My', label: 'My Reports' }, { key: 'matches', label: 'My Matches' }] : [])
  ];

  return (
    <div className="lost-found-container">
      <div className="lost-found-header">
        <h2>Lost &amp; Found Pets</h2>
        <p>Help us reunite these pets with their loving families.</p>
        <div className="filter-tabs" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`btn ${activeTab === tab.key ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '15px' }}>
          <Link to="/lost-and-found/report?type=lost" className="btn btn-primary">Report a Missing Pet</Link>
          <Link to="/lost-and-found/report?type=found" className="btn btn-secondary">Report a Found Pet</Link>
          {isAdmin && <Link to="/admin/matches" className="btn btn-secondary">Review Possible Matches</Link>}
        </div>
      </div>

      {activeTab === 'matches' ? (
        <MyMatches />
      ) : error ? (
        <div className="error-message" style={{ textAlign: 'center', marginTop: '24px' }}>
          {error}
        </div>
      ) : (
        <div className="lost-pets-grid">
          {filteredReports.length === 0 ? (
            <p className="no-pets">
              {activeTab === 'My' ? "You haven't submitted any reports yet." : 'No reports here right now.'}
            </p>
          ) : (
            filteredReports.map((report) => {
              const type = reportTypeOf(report);
              const photo = firstPhoto(report);
              const species = speciesLabel(report);
              return (
                <div key={report._id} className="lost-pet-card">
                  <div className="pet-image-container">
                    {photo && isSafeImageSrc(photo) ? (
                      <img
                        src={photo}
                        alt={report.petName}
                        className="pet-image"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="pet-image-placeholder">No Image</div>
                    )}
                    <span className={`lost-found-badge ${type}`}>{type === 'found' ? 'Found' : 'Lost'}</span>
                    {report.status !== 'Lost' && report.status !== 'Found' && (
                      <span className="lost-found-status">{report.status}</span>
                    )}
                  </div>
                  <div className="pet-info">
                    <h3>{report.petName && report.petName !== 'Unknown' ? report.petName : (type === 'found' ? 'Unknown name' : report.petName)}</h3>
                    {species && <p><strong>Species:</strong> {species}</p>}
                    <p><strong>Breed:</strong> {report.breed}</p>
                    <p><strong>Colour:</strong> {report.color}</p>
                    <p><strong>{type === 'found' ? 'Found at' : 'Last seen'}:</strong> {report.lastSeenLocation}</p>
                    <p><strong>Date:</strong> {formatDate(report.lastSeenDate)}</p>
                    {report.imageCount > 1 && <p className="pet-photo-count">{report.imageCount} photos</p>}
                    {report.description && <p className="pet-description">{report.description}</p>}
                    <div className="contact-info">
                      <strong>Contact:</strong> {report.contactInfo}
                    </div>

                    {user && report.status !== 'Resolved' && (isMine(report) || isAdmin) && (
                      <div className="status-actions" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        {isAdmin && report.status !== 'In Progress' && (
                          <button
                            onClick={() => handleStatusUpdate(report._id, 'In Progress')}
                            className="btn btn-small"
                            style={{ flex: 1, padding: '6px', fontSize: '12px', backgroundColor: '#F59E0B', color: '#fff', border: 'none' }}
                          >
                            Mark In Progress
                          </button>
                        )}
                        <button
                          onClick={() => handleStatusUpdate(report._id, 'Resolved')}
                          className="btn btn-success btn-small"
                          style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                        >
                          Mark Resolved
                        </button>
                      </div>
                    )}
                    {user && (isMine(report) || isAdmin) && (
                      <div className="report-actions" style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                        <Link to={`/lost-and-found/edit/${report._id}`} className="btn btn-secondary btn-small" style={{ flex: 1, textAlign: 'center', padding: '8px' }}>
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(report._id)}
                          className="btn btn-primary btn-small"
                          style={{ flex: 1, padding: '8px', backgroundColor: '#e74c3c' }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default LostFoundFeed;
