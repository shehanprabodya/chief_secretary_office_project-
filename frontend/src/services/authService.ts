import type { LoginCredentials, AuthResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
export const AUTH_STORAGE_KEYS = {
  token: 'auth_token',
  refreshToken: 'refresh_token',
  user: 'auth_user',
  rememberMe: 'remember_me',
} as const;

// 🔧 TOGGLE THIS: true = use fake login, false = use real Laravel API
const USE_MOCK_AUTH = true;

// Mock delay to simulate network request (feels more realistic)
const mockDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fake users you can "log in" with during development
const MOCK_USERS: Record<string, { password: string; user: AuthResponse['user'] }> = {
  'j.doe@spc.gov.lk': {
    password: 'password123',
    user: {
      id: '1',
      email: 'j.doe@spc.gov.lk',
      name: 'J. Doe',
      role: 'officer',
      department: 'Development Division',
      designation: 'Senior Officer',
    },
  },
  'admin@spc.gov.lk': {
    password: 'admin123',
    user: {
      id: '2',
      email: 'admin@spc.gov.lk',
      name: 'Chief Secretary',
      role: 'admin',
      department: 'Office of the Chief Secretary',
      designation: 'Chief Secretary',
    },
  },
};

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    if (USE_MOCK_AUTH) {
      await mockDelay(800); // simulate network latency

      const mockEntry = MOCK_USERS[credentials.email.toLowerCase()];

      if (!mockEntry || mockEntry.password !== credentials.password) {
        throw new Error('Invalid email or password (mock mode)');
      }

      return {
        user: mockEntry.user,
        token: 'mock-jwt-token-' + Date.now(),
        expiresIn: 3600,
      };
    }

    // ===== REAL API CALL (used when USE_MOCK_AUTH = false) =====
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Login failed (${response.status})`
        );
      }

      const data: AuthResponse = await response.json();
      return data;
    } catch (error) {
      throw new Error('Network error. Please check your connection.', {
        cause: error,
      });
    }
  },

  async logout(): Promise<void> {
    if (USE_MOCK_AUTH) {
      await mockDelay(200);
      return;
    }

    try {
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.token);
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  async refreshToken(): Promise<string> {
    if (USE_MOCK_AUTH) {
      await mockDelay(200);
      const fakeToken = 'mock-jwt-token-' + Date.now();
      localStorage.setItem(AUTH_STORAGE_KEYS.token, fakeToken);
      return fakeToken;
    }

    try {
      const refreshToken = localStorage.getItem(AUTH_STORAGE_KEYS.refreshToken);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem(AUTH_STORAGE_KEYS.token, data.token);
      return data.token;
    } catch (error) {
      localStorage.removeItem(AUTH_STORAGE_KEYS.token);
      localStorage.removeItem(AUTH_STORAGE_KEYS.refreshToken);
      throw new Error('Network error. Please check your connection.', {
        cause: error,
      });
    }
  },

  getAuthToken(): string | null {
    return localStorage.getItem(AUTH_STORAGE_KEYS.token);
  },

  setAuthToken(token: string): void {
    localStorage.setItem(AUTH_STORAGE_KEYS.token, token);
  },
};
