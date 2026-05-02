import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../api/axios';
import BreederIcon from '../Breeder/BreederIcons';
import './AdminDashboard.css';

const formatDate = (date) => {
  if (!date) return 'Not available';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const VeterinarianDashboard = () => {
  const [pets, setPets] = useState([]);
  const [users, setUsers] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadVetData = useCallback(async () => {
    try {
      setError('');
      const [petsRes, usersRes, upcomingRes, overdueRes] = await Promise.all([
        axios.get('/api/pets'),
        axios.get('/api/users'),
        axios.get('/api/vaccinations/upcoming?days=30'),
        axios.get('/api/vaccinations/overdue')
      ]);

      setPets(petsRes.data.pets || []);
      setUsers(usersRes.data.users || []);
      setUpcoming(upcomingRes.data.vaccinations || []);
      setOverdue(overdueRes.data.vaccinations || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load veterinarian dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVetData();
  }, [loadVetData]);

  const petTypeSummary = useMemo(() => {
    return pets.reduce((acc, pet) => {
      const type = pet.petType === 'Other' ? pet.petTypeOther || 'Other' : pet.petType;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }, [pets]);

  return (
    <div className="dashboard vet-dashboard">
      <section className="admin-part-hero vet">
        <div>
          <p className="authority-eyebrow">Veterinarian Workspace</p>
          <h1>Veterinarian Dashboard</h1>
          <p>Manage pet registrations, vaccination records, upcoming schedules, and owner clinical support.</p>
        </div>
        <div className="authority-hero-actions">
          <Link to="/admin/pets" className="btn btn-primary"><BreederIcon name="animals" /> View Pets</Link>
          <Link to="/admin/users" className="btn btn-secondary"><BreederIcon name="user" /> Pet Owners</Link>
        </div>
      </section>

      {loading && <div className="loading">Loading veterinarian dashboard...</div>}
      {error && <div className="error-message">{error}</div>}

      {!loading && !error && (
        <>
          <section className="authority-metrics-grid vet-metrics">
            <article className="authority-metric">
              <div className="authority-metric-icon"><BreederIcon name="animals" /></div>
              <div><span>Registered Pets</span><strong>{pets.length}</strong><p>Clinical records available</p></div>
            </article>
            <article className="authority-metric">
              <div className="authority-metric-icon"><BreederIcon name="user" /></div>
              <div><span>Pet Owners</span><strong>{users.length}</strong><p>Registered owner accounts</p></div>
            </article>
            <article className="authority-metric">
              <div className="authority-metric-icon"><BreederIcon name="calendar" /></div>
              <div><span>Upcoming Vaccinations</span><strong>{upcoming.length}</strong><p>Due within 30 days</p></div>
            </article>
            <article className="authority-metric">
              <div className="authority-metric-icon"><BreederIcon name="alert" /></div>
              <div><span>Overdue Vaccinations</span><strong>{overdue.length}</strong><p>Require follow-up</p></div>
            </article>
          </section>

          <section className="authority-grid two-columns">
            <article className="authority-card">
              <div className="authority-section-header">
                <div>
                  <p className="authority-eyebrow">Vaccination Worklist</p>
                  <h2>Upcoming Vaccinations</h2>
                </div>
              </div>
              <div className="authority-table-wrap">
                <table className="authority-table">
                  <thead>
                    <tr>
                      <th>Pet</th>
                      <th>Vaccine</th>
                      <th>Due Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.slice(0, 8).map((record) => (
                      <tr key={record._id}>
                        <td>{record.pet?.petName || 'Unknown pet'}</td>
                        <td>{record.vaccineName}</td>
                        <td>{formatDate(record.nextDueDate)}</td>
                        <td>
                          {record.pet?._id && (
                            <Link className="btn btn-secondary btn-small" to={`/admin/vaccinations/${record.pet._id}`}>Manage</Link>
                          )}
                        </td>
                      </tr>
                    ))}
                    {upcoming.length === 0 && (
                      <tr><td colSpan="4">No upcoming vaccinations.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="authority-card">
              <div className="authority-section-header">
                <div>
                  <p className="authority-eyebrow">Pet Registry</p>
                  <h2>Recent Pet Registrations</h2>
                </div>
                <Link to="/admin/pets" className="text-link">View all</Link>
              </div>
              <div className="authority-table-wrap">
                <table className="authority-table">
                  <thead>
                    <tr>
                      <th>Pet</th>
                      <th>Type</th>
                      <th>Owner</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pets.slice(0, 8).map((pet) => (
                      <tr key={pet._id}>
                        <td>{pet.petName}</td>
                        <td>{pet.petType === 'Other' ? pet.petTypeOther : pet.petType}</td>
                        <td>{pet.owner?.fullName || 'Unknown'}</td>
                        <td>{formatDate(pet.registrationDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          </section>

          <section className="authority-card">
            <div className="authority-section-header">
              <div>
                <p className="authority-eyebrow">Clinical Overview</p>
                <h2>Registered Animal Types</h2>
              </div>
            </div>
            <div className="animal-type-grid">
              {Object.entries(petTypeSummary).map(([type, count]) => (
                <div key={type} className="animal-type-card">
                  <strong>{count}</strong>
                  <span>{type}</span>
                </div>
              ))}
              {Object.keys(petTypeSummary).length === 0 && <p className="authority-empty">No pets registered yet.</p>}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default VeterinarianDashboard;
