import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from '../../api/axios';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verifyingId, setVerifyingId] = useState('');
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

  const handleVerify = async (userId) => {
    setVerifyingId(userId);
    setError('');
    setMessage('');

    try {
      const response = await axios.patch(`/api/users/${userId}/verify`);
      setUsers((currentUsers) => currentUsers.map((user) => (
        user._id === userId ? response.data.user : user
      )));
      setMessage(response.data.message);
    } catch (verifyError) {
      setError(verifyError.response?.data?.message || 'Failed to verify user');
    } finally {
      setVerifyingId('');
    }
  };

  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  if (error) {
    if (users.length === 0) {
      return <div className="error-message">{error}</div>;
    }
  }

  const orderedUsers = [...users].sort((first, second) => (
    Number(first.isVerified !== false) - Number(second.isVerified !== false)
  ));

  return (
    <div className="dashboard">
      <h1>Registered Users</h1>
      {message && <div className="success-message">{message}</div>}
      {error && <div className="error-message">{error}</div>}
      
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
                  <th style={{ width: '12%' }}>Full Name</th>
                  <th style={{ width: '18%' }}>Email</th>
                  <th style={{ width: '11%' }}>Phone</th>
                  <th style={{ width: '12%' }}>NIC Number</th>
                  <th style={{ width: '10%' }}>City</th>
                  <th style={{ width: '11%' }}>Status</th>
                  <th style={{ width: '26%' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {orderedUsers.map((user) => {
                  const isVerified = user.isVerified !== false;

                  return (
                    <tr key={user._id}>
                      <td>{user.fullName}</td>
                      <td>{user.email}</td>
                      <td>{user.phone}</td>
                      <td>{user.nicNumber}</td>
                      <td>{user.address?.city || '—'}</td>
                      <td>
                        <span className={`verification-badge ${isVerified ? 'verified' : 'pending'}`}>
                          {isVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="actions-cell">
                      {!isVerified && (
                        <button
                          onClick={() => handleVerify(user._id)}
                          className="btn verify-user-button"
                          disabled={verifyingId === user._id}
                        >
                          {verifyingId === user._id ? 'Verifying...' : 'Verify'}
                        </button>
                      )}
                      <button
                        onClick={() => handleRegisterPet(user._id)}
                        className="btn btn-primary"
                        disabled={!isVerified}
                        title={!isVerified ? 'Verify this user before registering a pet' : undefined}
                      >
                        Register Pet
                      </button>
                      <button
                        onClick={() => navigate(`/admin/edit-user/${user._id}`)}
                        className="btn btn-secondary"
                      >
                        Edit
                      </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;
