import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardPathForRole } from '../utils/roleRoutes';
import Header from '../components/layouts/Header';
import Footer from '../components/layouts/Footer';
import Hero from '../components/Landing/Hero';
import PillarsSection from '../components/Landing/PillarsSection';
import LoginModal from '../components/auth/LoginModal';

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const { isAuthenticated, user, isLoading } = useAuth();

  if (!isLoading && isAuthenticated && user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return (
    <>
      <div className={showLogin ? 'blur-sm pointer-events-none transition-all duration-300' : 'transition-all duration-300'}>
        <Header />
        <main>
          <Hero onLoginClick={() => setShowLogin(true)} />
          <PillarsSection />
        </main>
        <Footer />
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </>
  );
}
