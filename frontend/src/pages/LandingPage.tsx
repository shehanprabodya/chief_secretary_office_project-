import Header from "../components/layouts/Header";
import Footer from "../components/layouts/Footer";
import Hero from "../components/Landing/Hero";
import PillarsSection from "../components/Landing/PillarsSection";

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