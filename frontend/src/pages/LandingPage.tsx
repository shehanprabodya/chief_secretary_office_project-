import Header from "../components/layouts/Header";
import Footer from "../components/layouts/Footer";
import Hero from "../components/landing/HeroSection";
import PillarsSection from "../components/landing/PillarsSection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <Header />

      <main>
        <Hero />
        <PillarsSection />
      </main>

      <Footer />
    </div>
  );
}