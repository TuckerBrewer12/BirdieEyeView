import { PublicNav } from "./components/PublicNav";
import { HeroSection } from "./sections/HeroSection";
import { ScannedSection } from "./sections/ScannedSection";
import { useTryItYourselfViewModel } from "./useTryItYourselfViewModel";

export function LandingPage() {
  const viewModel = useTryItYourselfViewModel();
  return (
    <div className="min-h-screen bg-card">
      <PublicNav />
      {viewModel.step === "review" ? <ScannedSection viewModel={viewModel} /> : <HeroSection viewModel={viewModel} />}
    </div>
  );
}
