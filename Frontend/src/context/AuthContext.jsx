import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Set axios default headers
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUser();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadUser = useCallback(async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Error loading user:', error);
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await axios.post('/api/auth/signup', userData);
      const { token: signupToken, user: registeredUser, message, requiresVerification } = response.data;

      if (signupToken) {
        localStorage.setItem('token', signupToken);
        setToken(signupToken);
        setUser(registeredUser);
      }

      return {
        success: true,
        user: registeredUser,
        message,
        requiresVerification: Boolean(requiresVerification)
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Signup failed'
      };
    }
  };

  const socialLogin = async (provider, idToken, fullName = '') => {
    try {
      const response = await axios.post(`/api/auth/oauth/${provider}`, { idToken, fullName });
      const { token: sessionToken, user: authenticatedUser } = response.data;

      localStorage.setItem('token', sessionToken);
      setToken(sessionToken);
      setUser(authenticatedUser);

      return { success: true, user: authenticatedUser };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Social login failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const refreshUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    socialLogin,
    logout,
    refreshUser,
    role: user?.role || (user?.isAdmin ? 'admin' : 'user'),
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || user?.role === 'admin',
    isVet: user?.role === 'veterinarian' || user?.role === 'admin' || user?.isAdmin || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
