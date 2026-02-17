import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import AdminDashboard from './components/Admin/AdminDashboard';
import UserList from './components/Admin/UserList';
import AllPets from './components/Admin/AllPets';
import PetRegistration from './components/Admin/PetRegistration';
import VaccinationManagement from './components/Admin/VaccinationManagement';
import EditUser from './components/Admin/EditUser';
import UserDashboard from './components/User/UserDashboard';
import EditProfile from './components/User/EditProfile';
import MyPets from './components/User/MyPets';
import VaccinationSchedule from './components/User/VaccinationSchedule';
import PetProfile from './components/Public/PetProfile';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/user/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/user/dashboard'} replace />;
  }

  return children;
};

// Home Page Component
const HomePage = () => {
  const { isAuthenticated, isAdmin } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin/dashboard' : '/user/dashboard'} replace />;
  }

  return (
    <div className="home-page">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-icon">🐾</div>
          <h1 className="hero-title">Welcome to Pet Management System</h1>
          <p className="hero-subtitle">
            A comprehensive system for managing pet ownership records, vaccination schedules, 
            and QR-based pet identification.
          </p>
          <div className="hero-buttons">
            <a href="/login" className="btn btn-primary btn-large">
              LOGIN
            </a>
            <a href="/signup" className="btn btn-secondary btn-large">
              SIGN UP
            </a>
          </div>
        </div>
        <div className="pet-images">
          <div className="pet-image pet-1">🐕</div>
          <div className="pet-image pet-2">🐈</div>
          <div className="pet-image pet-3">🦜</div>
          <div className="pet-image pet-4">🐰</div>
        </div>
      </div>
    </div>
  );
};

function AppContent() {
  return (
    <div className="app-container">
      <Navbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          <Route 
            path="/signup" 
            element={
              <PublicRoute>
                <Signup />
              </PublicRoute>
            } 
          />
          
          {/* Public Pet Profile - No authentication required */}
          <Route path="/pet-profile/:petId" element={<PetProfile />} />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute adminOnly={true}>
                <UserList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pets"
            element={
              <ProtectedRoute adminOnly={true}>
                <AllPets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/register-pet/:userId"
            element={
              <ProtectedRoute adminOnly={true}>
                <PetRegistration />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/vaccinations/:petId"
            element={
              <ProtectedRoute adminOnly={true}>
                <VaccinationManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/edit-user/:userId"
            element={
              <ProtectedRoute adminOnly={true}>
                <EditUser />
              </ProtectedRoute>
            }
          />

          {/* User Routes */}
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/my-pets"
            element={
              <ProtectedRoute>
                <MyPets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/vaccinations"
            element={
              <ProtectedRoute>
                <VaccinationSchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/edit-profile"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;