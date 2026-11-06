import { PublicNav } from "./components/PublicNav";
import { HeroSection } from "./sections/HeroSection";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-card">
      <PublicNav />
      <HeroSection />
    </div>
  );
}
