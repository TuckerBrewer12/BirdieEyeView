import { AnimatePresence, motion } from "framer-motion";
import { motion as motionTokens } from "@/brand/theme";
import { ScannerDemo } from "../components/ScannerDemo";
import { useTryItYourselfViewModel } from "../useTryItYourselfViewModel";
import { TryItYourselfSection } from "./TryItYourselfSection";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  const viewModel = useTryItYourselfViewModel();
  // The demo shows what a scan does until the visitor starts one of their
  // own; then it steps aside so their scorecard gets the full width.
  const showDemo = viewModel.step === "upload";

  return (
    <section className="mx-auto max-w-6xl px-6 pt-14 pb-24 md:pt-20">
      <div className="flex flex-col items-center gap-12 lg:flex-row">
        <motion.div layout transition={{ duration: motionTokens.duration.collapse, ease: EASE_OUT }} className="w-full lg:flex-1">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE_OUT }}
            className="mb-8 text-center lg:text-left"
          >
            <h1 className="mb-5 text-4xl text-balance leading-display font-extrabold tracking-hero text-foreground md:text-5xl lg:text-6xl">
              Scan your scorecard.
            </h1>
            <div className="flex flex-col gap-2 text-lg text-balance text-muted-foreground">
              <p>One photo captures the course, tees, yardages, slope, and every score on the card.</p>
              <p>Track your handicap, scores, and stats over time, and see where you&rsquo;re losing strokes.</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: EASE_OUT }}
          >
            <TryItYourselfSection viewModel={viewModel} />
          </motion.div>
        </motion.div>

        <AnimatePresence>
          {showDemo && (
            <motion.div
              key="demo"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE_OUT }}
              className="flex w-full justify-center lg:flex-1"
            >
              <ScannerDemo />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
