import React, { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call - replace with actual backend call
    try {
      // const response = await fetch('https://your-api.com/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email, password })
      // });
      // const data = await response.json();

      // For now, simulate delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      if (!email || !password) {
        setError('Please fill in all fields');
        setIsLoading(false);
        return;
      }

      // TODO: Handle successful login - redirect to dashboard
      console.log('Login attempt:', { email, password, rememberMe });
      // window.location.href = '/dashboard';
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in scale-95 duration-300"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="relative bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-8 flex flex-col items-center">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              aria-label="Close"
            >
              <X size={24} />
            </button>

            {/* Logo */}
            <div className="mb-4 bg-yellow-400 rounded-full p-3">
              <svg
                className="w-12 h-12 text-blue-900"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
            </div>

            <h2 className="text-white text-2xl font-bold">MMCS Portal</h2>
            <p className="text-blue-100 text-sm mt-2">
              Meeting Management & Collaboration System
            </p>
          </div>

          {/* Modal Body */}
          <div className="px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username or Official Email
                </label>
                <div className="relative">
                  <Mail
                    size={20}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="j.doe@spc.gov.lk"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={20}
                    className="absolute left-3 top-3 text-gray-400"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 transition"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                  <X size={16} />
                  {error}
                </div>
              )}

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                  disabled={isLoading}
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  Remember this workstation
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-900 hover:bg-blue-950 disabled:bg-gray-400 text-white font-semibold py-2.5 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </>
                )}
              </button>
            </form>

            {/* Forgot Password Link */}
            <div className="mt-6 text-center">
              <a
                href="#forgot-password"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Forgot Password?
              </a>
            </div>

            {/* Divider */}
            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Don't have access?
                </span>
              </div>
            </div>

            {/* Request Access Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-full mt-6 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold py-2.5 rounded-lg transition"
            >
              Request Access from Administrator
            </button>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-center text-xs text-gray-500">
            © 2024 Office of the Chief Secretary - Southern Provincial Council
          </div>
        </div>
      </div>
    </>
  );
};
