import { PublicNav } from "./components/PublicNav";
import { HeroSection } from "./sections/HeroSection";
import { HowItWorksSection } from "./sections/HowItWorksSection";
import { useLandingPageViewModel } from "./useLandingPageViewModel";

export function LandingPage() {
  const viewModel = useLandingPageViewModel();

  return (
    <div className="public-landing min-h-screen bg-card">
      <PublicNav viewModel={viewModel} />
      <HeroSection viewModel={viewModel} />
      <HowItWorksSection />
    </div>
  );
}
