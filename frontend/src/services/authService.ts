import { api } from '../lib/axios';
import type { LoginCredentials, AuthResponse, AuthUser } from '../types/auth';
import { isAxiosError } from 'axios';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    return err.response?.data?.message || fallback;
  }
  return fallback;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        identifier: credentials.identifier,
        password: credentials.password,
        remember_me: credentials.rememberMe ?? false,
      });
      return data;
    } catch (err) {
      throw new Error(
        extractErrorMessage(err, 'Login failed. Please try again.'),
        { cause: err }
      );
    }
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request failed:', err);
    }
  },

  async getCurrentUser(): Promise<{ user: AuthUser }> {
    const { data } = await api.get<{ user: AuthUser }>('/auth/me');
    return data;
  },
};