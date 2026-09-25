import { PublicNav } from "./components/PublicNav";
import { HeroSection } from "./sections/HeroSection";
import { HowItWorksSection } from "./sections/HowItWorksSection";

export function LandingPage() {
  return (
    <div className="public-landing min-h-screen bg-card">
      <PublicNav />
      <HeroSection />
      <HowItWorksSection />
    </div>
  );
}
