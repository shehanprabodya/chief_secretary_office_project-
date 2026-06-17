import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, LoginCredentials, AuthContextType, AuthResponse } from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const storedUser = localStorage.getItem('auth_user');
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
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
      // TODO: Replace with actual API call to your Laravel backend
      // const response = await fetch('http://your-api.com/api/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     email: credentials.email,
      //     password: credentials.password
      //   })
      // });

      // const data: AuthResponse = await response.json();

      // For now, simulate API response
      const mockResponse: AuthResponse = {
        token: 'mock_jwt_token_' + Date.now(),
        user: {
          id: '1',
          email: credentials.email,
          name: 'Kumari Perera',
          role: 'officer',
          department: 'Finance & Treasury',
          designation: 'Senior Accountant'
        },
        expiresIn: 86400
      };

      const data = mockResponse;

      // Store token and user
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      // Remember me functionality
      if (credentials.rememberMe) {
        localStorage.setItem('remember_me', 'true');
      }

      setToken(data.token);
      setUser(data.user);

      // Redirect to dashboard
      // window.location.href = '/dashboard';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('remember_me');
    setToken(null);
    setUser(null);
    setError(null);
    // Redirect to landing page
    // window.location.href = '/';
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
