import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { token } = useAuth();

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setUsers(response.data.users);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to fetch users');
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token, fetchUsers]);

  const handleRegisterPet = (userId) => {
    navigate(`/admin/register-pet/${userId}`);
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>Registered Users</h1>
      
      {users.length === 0 ? (
        <div className="card">
          <p>No users registered yet.</p>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Full Name</th>
                  <th style={{ width: '20%' }}>Email</th>
                  <th style={{ width: '12%' }}>Phone</th>
                  <th style={{ width: '13%' }}>NIC Number</th>
                  <th style={{ width: '12%' }}>City</th>
                  <th style={{ width: '28%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id}>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.phone}</td>
                    <td>{user.nicNumber}</td>
                    <td>{user.address.city}</td>
                    <td className="actions-cell">
                      <button
                        onClick={() => handleRegisterPet(user._id)}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '13px', marginRight: '8px', whiteSpace: 'nowrap' }}
                      >
                        REGISTER PET
                      </button>
                      <button
                        onClick={() => navigate(`/admin/edit-user/${user._id}`)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        ✏️ Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;