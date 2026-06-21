import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginCredentials, AuthContextType } from '../types/auth';
import { AUTH_STORAGE_KEYS, authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_STORAGE_KEYS.token);
};

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const storedUser = localStorage.getItem(AUTH_STORAGE_KEYS.user);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await authService.login(credentials);

      // Store token and user
      localStorage.setItem(AUTH_STORAGE_KEYS.token, data.token);
      localStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(data.user));

      // Remember me functionality
      if (credentials.rememberMe) {
        localStorage.setItem(AUTH_STORAGE_KEYS.rememberMe, 'true');
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEYS.rememberMe);
      }

      setToken(data.token);
      setUser(data.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    void authService.logout();
    localStorage.removeItem(AUTH_STORAGE_KEYS.token);
    localStorage.removeItem(AUTH_STORAGE_KEYS.user);
    localStorage.removeItem(AUTH_STORAGE_KEYS.rememberMe);
    setToken(null);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        error,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
