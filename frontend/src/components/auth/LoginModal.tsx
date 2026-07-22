
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, User as UserIcon, Lock, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getDashboardPathForRole } from '../../utils/roleRoutes';
import type { LoginCredentials } from '../../types/auth';
import logo from '../../assets/Srilankaemblem.png';

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const { login, isLoading, error: authError } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<LoginCredentials>({
    identifier: '',
    password: '',
  });

  useEffect(() => {
    const remembered = localStorage.getItem('rememberMe') === 'true';
    const savedIdentifier = localStorage.getItem('rememberedIdentifier') || '';
    setRememberMe(remembered);
    if (remembered) setCredentials((prev) => ({ ...prev, identifier: savedIdentifier }));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (formError) setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!credentials.identifier || !credentials.password) {
      setFormError('Please enter your email/username and password');
      return;
    }

    try {
      const loggedInUser = await login({ ...credentials, rememberMe });

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedIdentifier', credentials.identifier);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedIdentifier');
      }

      onClose();
      navigate(getDashboardPathForRole(loggedInUser.role), { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Close login modal"
        >
          <X className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </button>

        <div className="mb-8 flex flex-col items-center gap-4">
          <img src={logo} alt="Southern Province Emblem" className="h-16 w-auto" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign In to MMCS</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Southern Provincial Council</p>
          </div>
        </div>

        {(formError || authError) && (
          <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
            {formError || authError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="identifier" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email or Username
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
              <input
                id="identifier"
                name="identifier"
                type="text"
                value={credentials.identifier}
                onChange={handleInputChange}
                placeholder="j.doe@spc.gov.lk or j.doe"
                disabled={isLoading}
                autoComplete="username"
                className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-slate-900 placeholder-slate-500 transition-colors disabled:bg-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-slate-900 placeholder-slate-500 transition-colors disabled:bg-slate-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <label htmlFor="remember" className="text-sm text-slate-700 dark:text-slate-300">
              Remember this workstation
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 font-medium text-white transition-all hover:bg-blue-700 disabled:bg-slate-400"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
