export interface User {
  id: string;
  email: string;
  name: string;
  role: 'officer' | 'head' | 'secretary' | 'admin';
  department: string;
  designation: string;
  avatar?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn: number;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  error: string | null;
}