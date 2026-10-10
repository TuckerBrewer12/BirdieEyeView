import { AnimatePresence, motion } from "framer-motion";
import { motion as motionTokens } from "@/brand/theme";
import { ScannerDemo } from "../components/ScannerDemo";
import { useTryItYourselfViewModel } from "../useTryItYourselfViewModel";
import { TryItYourselfSection } from "./TryItYourselfSection";

export function HeroSection() {
  const viewModel = useTryItYourselfViewModel();
  // The demo shows what a scan does until the visitor starts one of their
  // own; then it steps aside so their scorecard gets the full width.
  const showDemo = viewModel.step === "upload";

  return (
    <section className="mx-auto max-w-6xl px-6 pt-14 pb-24 md:pt-20">
      <div className="flex flex-col items-center gap-12 lg:flex-row">
        <motion.div layout transition={motionTokens.layout} className="w-full lg:flex-1">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={motionTokens.entrance}
            className="mb-8 text-center lg:text-left"
          >
            <h1 className="mb-5 text-4xl text-balance leading-display font-extrabold tracking-hero text-foreground md:text-5xl lg:text-6xl">
              Scan your scorecard.
            </h1>
            <div className="flex flex-col gap-2 text-lg text-balance text-muted-foreground">
              <p>One photo captures the course, tees, yardages, slope, and every score on the card.</p>
              <p>Track your handicap, scores, stats, and more!</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...motionTokens.entrance, delay: 0.1 }}
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
              transition={{ ...motionTokens.entrance, delay: 0.2 }}
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
