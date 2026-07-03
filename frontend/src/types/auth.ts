export type UserRole = 'admin' | 'officer' | 'dept_head' | 'deputy' | 'chief_secretary'|'external_officer';

export interface LoginCredentials {
  identifier: string; // email OR username
  password: string;
  rememberMe?: boolean;
}

export interface AuthUser {
    id: string;
    full_name: string;
    email: string;
    username: string;
    role: UserRole;
    organization?: string | null;
    designation?: string | null;
    status: 'ACTIVE' | 'INACTIVE';
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthUser>;
  logout: () => Promise<void>;
  error: string | null;
}
