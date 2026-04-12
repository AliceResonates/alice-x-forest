import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '../api/base44Client';
import { client } from '../api/client';
import { appParams } from '../lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // Try to read app settings from base44 entities if available
      try {
        const settings = await base44.entities.App.get(appParams.appId);
        setAppPublicSettings(settings || null);
      } catch (e) {
        // fallback: no app settings available
        setAppPublicSettings(null);
      }

      // If we have a token, try to check user
      if (appParams.token) {
        await checkUserAuth();
      } else {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      setAuthError({ type: 'unknown', message: error?.message || 'Failed to load app' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);

      // If the shim has a currentUser, use it. Otherwise try to login with token if available.
      if (client && client.auth && client.auth.currentUser) {
        setUser(client.auth.currentUser);
        setIsAuthenticated(true);
        setIsLoadingAuth(false);
        return;
      }

      if (appParams.token && client && client.auth && typeof client.auth.login === 'function') {
        try {
          const u = await client.auth.login({ token: appParams.token });
          setUser(u);
          setIsAuthenticated(true);
        } catch (e) {
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsLoadingAuth(false);
    } catch (error) {
      setAuthError({ type: 'auth', message: error?.message || 'Auth check failed' });
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (client && client.auth && typeof client.auth.logout === 'function') {
      try {
        client.auth.logout();
      } catch (e) {
        // ignore
      }
    }
    if (shouldRedirect) window.location.href = '/';
  };

  const navigateToLogin = () => {
    // No SDK redirect available in shim — fallback to a /login page
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
