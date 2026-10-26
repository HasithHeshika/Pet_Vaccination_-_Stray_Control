import React, { useMemo, useState } from 'react';
import axios from '../../api/axios';
import { formatDate } from '../../utils/dateFormat';
import { incidentTypeLabel, urgencyLabel, mapLink } from '../../utils/incidents';

const isSafeImageSrc = (src) =>
  typeof src === 'string' && /^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(src);

// Authority view of public animal incident reports (violence, sick/injured, stray, other).
// The API returns open and most urgent reports first; photos are loaded per report on demand.
const IncidentReports = ({ reports = [], actionId, onStatusChange }) => {
  const [filter, setFilter] = useState('open');
  const [photos, setPhotos] = useState({});
  const [loadingPhotosId, setLoadingPhotosId] = useState('');

  const visibleReports = useMemo(
    () => (filter === 'open' ? reports.filter((report) => report.status !== 'resolved') : reports),
    [reports, filter]
  );

  const loadPhotos = async (report) => {
    try {
      setLoadingPhotosId(report._id);
      const response = await axios.get(`/api/stray-reports/${report._id}`);
      const detail = response.data.report;
      // Older reports could store any text as an image link, so only render real images
      const images = [...(detail.images || []), ...(detail.image ? [detail.image] : [])].filter(isSafeImageSrc);
      setPhotos((current) => ({ ...current, [report._id]: images }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to load photos');
    } finally {
      setLoadingPhotosId('');
    }
  };

  return (
    <article className="authority-card incident-reports-card">
      <div className="authority-section-header">
        <div>
          <p className="authority-eyebrow">Animal Welfare</p>
          <h2>Animal Incident Reports</h2>
        </div>
        <div className="authority-filter">
          {[{ value: 'open', label: 'Open' }, { value: 'all', label: 'All' }].map((option) => (
            <button
              key={option.value}
              type="button"
              className={filter === option.value ? 'active' : ''}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visibleReports.length === 0 ? (
        <p className="authority-empty">{filter === 'open' ? 'No open incident reports.' : 'No incident reports yet.'}</p>
      ) : (
        <div className="incident-list">
          {visibleReports.map((report) => {
            const link = mapLink(report.coordinates);
            const reportPhotos = photos[report._id];
            const reporter = [report.reporterName, report.reporterContact].filter(Boolean).join(' · ');

            return (
              <div key={report._id} className={`incident-row urgency-${report.urgency || 'normal'}`}>
                <div className="incident-main">
                  <div className="incident-badges">
                    <span className={`incident-urgency urgency-${report.urgency || 'normal'}`}>{urgencyLabel(report.urgency)}</span>
                    <span className="incident-type">{incidentTypeLabel(report)}</span>
                    <span className="incident-date">{formatDate(report.reportedAt || report.createdAt)}</span>
                  </div>
                  <strong>
                    {report.location}
                    {link && (
                      <>
                        {' '}
                        <a href={link} target="_blank" rel="noopener noreferrer">(map)</a>
                      </>
                    )}
                  </strong>
                  <span>{report.description}</span>
                  <span className="incident-reporter">
                    Reported by: {reporter || report.reportedBy?.fullName || 'Anonymous'}
                  </span>

                  {report.imageCount > 0 && !reportPhotos && (
                    <button
                      type="button"
                      className="link-button incident-photos-button"
                      onClick={() => loadPhotos(report)}
                      disabled={loadingPhotosId === report._id}
                    >
                      {loadingPhotosId === report._id ? 'Loading photos...' : `View ${report.imageCount} photo${report.imageCount > 1 ? 's' : ''}`}
                    </button>
                  )}
                  {reportPhotos && (
                    <div className="incident-photos">
                      {reportPhotos.length === 0 && <span>No viewable photos.</span>}
                      {reportPhotos.map((photo, index) => (
                        <img key={index} src={photo} alt={`Incident at ${report.location}, ${index + 1}`} />
                      ))}
                    </div>
                  )}
                </div>

                <select
                  className={`authority-status ${report.status}`}
                  value={report.status}
                  disabled={actionId === report._id}
                  onChange={(e) => onStatusChange(report._id, e.target.value)}
                  aria-label={`Status of incident at ${report.location}`}
                >
                  <option value="pending">pending</option>
                  <option value="in-progress">in-progress</option>
                  <option value="resolved">resolved</option>
                </select>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
};

export default IncidentReports;
