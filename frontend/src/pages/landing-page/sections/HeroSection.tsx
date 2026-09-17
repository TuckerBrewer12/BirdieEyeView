import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/brand";
import { motion as motionTokens } from "@/brand/theme";
import { ScannerDemo } from "../components/ScannerDemo";
import type { LandingPageViewModel } from "../useLandingPageViewModel";

interface HeroSectionProps {
  viewModel: LandingPageViewModel;
}

export function HeroSection({ viewModel }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-card pt-20 pb-24 md:pt-32 md:pb-36">
      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-16 px-6 lg:flex-row">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: motionTokens.duration.collapse, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 text-center lg:text-left"
        >
          <h1 className="mb-6 text-5xl leading-display font-extrabold tracking-hero text-foreground md:text-6xl lg:text-7xl">
            {viewModel.heroHeadline}
            <br />
            <span className="text-primary">{viewModel.heroHighlight}</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-xl leading-relaxed text-muted-foreground lg:mx-0">
            {viewModel.heroBody}
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
            <Button size="cta" shape="pill" render={<Link to={viewModel.heroPrimary.to} />}>
              {viewModel.heroPrimary.label}
            </Button>
            <Button variant="linkMuted" size="cta" onClick={viewModel.heroSecondary.select}>
              {viewModel.heroSecondary.label}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </motion.div>

        <div className="flex w-full flex-1 items-center justify-center">
          <ScannerDemo />
        </div>
      </div>
    </section>
  );
}
