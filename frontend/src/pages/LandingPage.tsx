import Header from "../components/layouts/Header";
import Footer from "../components/layouts/Footer";
import Hero from "../components/Landing/Hero";
import PillarsSection from "../components/Landing/PillarsSection";
import { LoginModal } from "../components/auth/LoginModal";
import { useState } from "react";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <>
      <div
        className={
          showLogin
            ? "blur-sm pointer-events-none"
            : ""
        }
      >
        <Header />

        <main>
          <Hero
            onLoginClick={() => setShowLogin(true)}
          />

          <PillarsSection />
        </main>

        <Footer />
      </div>

      {showLogin && (
        <LoginModal
          isOpen={showLogin}
          onClose={() => setShowLogin(false)}
        />
      )}
    </>
  );
}