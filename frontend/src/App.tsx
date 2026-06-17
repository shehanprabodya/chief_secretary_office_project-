import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';

// This component is inside AuthProvider so it can use useAuth
const AppContent = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Optional: Check if user is already logged in from localStorage
  useEffect(() => {
    // Auth context already handles this in its useEffect
    // This is just for logging or analytics if needed
    const token = localStorage.getItem('authToken');
    console.log('Auth token exists:', !!token);
  }, []);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center">
          <div className="inline-block">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500"></div>
          </div>
          <p className="mt-4 text-white text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // After authentication is confirmed, show appropriate page
  if (isAuthenticated) {
    return <DashboardPage />;
  }

  // Not authenticated, show landing page
  return <LandingPage />;
};

// Main App component wrapped with AuthProvider
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}