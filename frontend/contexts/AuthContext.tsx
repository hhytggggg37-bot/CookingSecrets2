import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../utils/api';

// Auth state is intentionally JS-only (no TS types) to keep Expo web build + ESLint stable.
// User shape comes from backend `/api/auth/*` and `/api/auth/me`.

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userData = await AsyncStorage.getItem('user');
      
      if (token && userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, isStaff = false) => {
    try {
      const endpoint = isStaff ? '/auth/staff-login' : '/auth/login';
      const response = await api.post(endpoint, { email, password });
      
      const { access_token, user: userData } = response.data;
      
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
    } catch (error) {
      throw new Error(error?.response?.data?.detail || 'Login failed');
    }
  };

  const signup = async (email, password, name, role) => {
    try {
      const response = await api.post('/auth/signup', { email, password, name, role });
      
      const { access_token, user: userData } = response.data;
      
      await AsyncStorage.setItem('token', access_token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
    } catch (error) {
      throw new Error(error?.response?.data?.detail || 'Signup failed');
    }
  };

  const logout = async () => {
    try {
      // Clear persisted auth + any session-like data
      await AsyncStorage.multiRemove(['token', 'user', 'guest_session_id']);

      // Also clear any in-memory default header (request interceptor reads AsyncStorage,
      // but this protects against any accidental default header usage).
      if (api.defaults.headers?.common) {
        delete api.defaults.headers.common.Authorization;
      }

      // Reset state LAST (ensures layouts/Redirects react immediately)
      setUser(null);
      console.log('Logout complete');
    } catch (error) {
      console.error('Logout error:', error);
      // Still force local state reset as a fail-safe
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data;
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
