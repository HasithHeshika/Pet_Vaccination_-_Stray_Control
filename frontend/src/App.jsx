import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import LandingPage from './components/LandingPage';
import Login from './components/Auth/Login';
import Signup from './components/Auth/Signup';
import AdminDashboard from './components/Admin/AdminDashboard';
import UserList from './components/Admin/UserList';
import AllPets from './components/Admin/AllPets';
import PetRegistration from './components/Admin/PetRegistration';
import VaccinationManagement from './components/Admin/VaccinationManagement';
import UserDashboard from './components/User/UserDashboard';
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

function AppContent() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  // Show Navbar on all pages except landing page when not authenticated
  const showNavbar = isAuthenticated || location.pathname !== '/';

  // Remove padding for landing page only
  const isLandingPage = location.pathname === '/' && !isAuthenticated && !loading;

  return (
    <div className="app-container">
      {showNavbar && <Navbar />}
      <div className="main-content" style={isLandingPage ? { padding: 0, maxWidth: 'none' } : {}}>
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to={isAdmin ? '/admin/dashboard' : '/user/dashboard'} replace />
              ) : (
                <LandingPage />
              )
            } 
          />
          
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

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
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