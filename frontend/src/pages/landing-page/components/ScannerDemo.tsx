import type { CSSProperties } from "react";
import { ScanLine, Type, GripVertical, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { motion as motionTokens } from "@/brand/theme";
import { cn } from "@/brand/cn";
import { scoreFillClass, toParDisplay } from "@/brand";
import { HANDICAP_TAP, TOUR_SCREENS, tourImage, type TourScreen } from "./demoTour";
import {
  DEMO_MOTION,
  useScannerDemoViewModel,
  type DemoScorecardRow,
} from "./useScannerDemoViewModel";

/** The clean scorecard the scan resolves to. */
function DigitalScorecard({ rows }: { rows: DemoScorecardRow[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DEMO_MOTION.crossfade }}
      className="pointer-events-none absolute inset-0 z-10 flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card p-4 md:p-6"
    >
      <div className="flex items-center justify-between rounded-t-lg bg-demo-card-header p-3 text-xs text-primary-foreground shadow-md md:text-sm">
        <span className="font-semibold">Half Moon Bay Golf Course</span>
        <div className="text-right">
          <div className="text-caption font-bold uppercase tracking-chip text-primary-foreground/90 sm:text-xs">Blue tees</div>
          <div className="text-caption text-primary-foreground/70">Rating 70.8 / Slope 127</div>
        </div>
      </div>

      <div className="grid flex-1 overflow-hidden rounded-b-lg border-r border-b border-l border-border bg-card font-sans text-meta font-medium text-muted-foreground shadow-card sm:text-label">
        <div className="grid grid-cols-11 items-center border-b border-border text-center">
          <div className="col-span-2 py-2 pl-3 text-left font-bold tracking-chip text-muted-foreground">HOLE</div>
          {rows.map((row) => (
            <div key={row.hole} className="py-2 font-bold text-foreground">{row.hole}</div>
          ))}
        </div>

        <div className="grid grid-cols-11 items-center border-b border-border text-center">
          <div className="col-span-2 py-2 pl-3 text-left font-bold text-foreground">Par</div>
          {rows.map((row) => (
            <div key={row.hole} className="py-2 font-bold text-muted-foreground">{row.par}</div>
          ))}
        </div>

        <div className="grid grid-cols-11 items-center border-b border-border text-center">
          <div className="col-span-2 py-2 pl-3 text-left font-bold text-foreground">Score</div>
          {rows.map((row) => (
            <div key={row.hole} className="py-1">
              <span
                className={cn(
                  "inline-block size-5 rounded-sm leading-5 text-primary-foreground sm:size-6 sm:leading-6",
                  scoreFillClass(row.score),
                )}
              >
                {row.strokes}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-11 items-center border-b border-border text-center">
          <div className="col-span-2 py-2 pl-3 text-left font-bold text-foreground">To Par</div>
          {rows.map((row) => (
            <div
              key={row.hole}
              className={`py-2 font-semibold ${row.overPar ? "text-score-bogey" : "text-muted-foreground"}`}
            >
              {toParDisplay(row.toPar)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-11 items-center border-b border-border text-center">
          <div className="col-span-2 py-2 pl-3 text-left font-bold text-foreground">Putts</div>
          {rows.map((row) => (
            <div key={row.hole} className="py-2 text-muted-foreground">{row.putts}</div>
          ))}
        </div>

        <div className="grid grid-cols-11 items-center border-b border-border text-center">
          <div className="col-span-2 py-2 pl-3 text-left font-bold text-score-birdie">GIR</div>
          {rows.map((row) => (
            <div key={row.hole} className="flex justify-center py-2">
              <div
                className={`size-2 rounded-full border ${row.greenInRegulation ? "border-score-birdie bg-score-birdie" : "border-border"}`}
              />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function TypewriterLabel({ text }: { text: string }) {
  return (
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ staggerChildren: 0.1 }}>
      {text.split("").map((char, i) => (
        <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }}>
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** The "what's on your card" panel the scan asks about before reading. */
function MappingPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 pt-4 pb-16 sm:px-6"
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-card font-sans shadow-card">
        <div className="border-b border-border p-4">
          <h3 className="mb-3 text-sm font-bold text-foreground">What's on your card?</h3>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1 text-caption font-bold uppercase tracking-chip text-muted-foreground">
              Your Name On The Card
            </div>
            <div className="flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground">
              <TypewriterLabel text="T" />
              <motion.div
                animate={{ opacity: [1, 0] }}
                transition={{ repeat: Infinity, duration: DEMO_MOTION.caretBlink }}
                className="ml-1 h-4 w-0.5 bg-muted-foreground"
              />
            </div>
          </div>

          <div className="mb-3">
            <div className="mb-1.5 flex items-center gap-1 text-caption font-bold uppercase tracking-chip text-muted-foreground">
              Scoring Format
            </div>
            <div className="flex gap-2">
              <motion.div
                initial={{ opacity: 1 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 1.2, duration: DEMO_MOTION.emphasis }}
                className="flex flex-1 flex-col justify-center rounded-md border border-border p-2"
              >
                <div className="text-xs font-bold text-foreground">Total strokes</div>
                <div className="text-caption text-muted-foreground">e.g. 4, 5, 3</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: DEMO_MOTION.select }}
                className="flex flex-1 flex-col justify-center rounded-md border-2 border-score-birdie bg-accent p-2"
              >
                <motion.div
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ delay: 1.2, duration: DEMO_MOTION.emphasis }}
                >
                  <div className="text-xs font-bold text-score-birdie">To par</div>
                  <div className="text-caption text-score-birdie/70">e.g. +1, -1, E</div>
                </motion.div>
              </motion.div>
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1 text-caption font-bold uppercase tracking-chip text-muted-foreground">
              Also On The Card
            </div>
            <div className="flex gap-2">
              {["Putts", "Shots to green"].map((label, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0.4, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.8 + i * 0.4, duration: DEMO_MOTION.emphasis }}
                  className="flex items-center gap-2 rounded-md border border-score-birdie/40 bg-accent px-3 py-1.5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 1.9 + i * 0.4, type: "spring" }}
                  >
                    <CheckSquare className="size-3.5 text-score-birdie" />
                  </motion.div>
                  <span className="text-xs font-bold text-score-birdie">{label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-hidden bg-muted p-4">
          <div className="relative flex flex-col gap-2">
            <div className="relative flex gap-2">
              <div className="z-10 flex w-16 items-center justify-center rounded-md bg-scan-row-name text-xs font-bold text-primary-foreground shadow-card">
                NAME
              </div>
              <motion.div
                initial={{ x: "120%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 2.6, ...DEMO_MOTION.rowSpring }}
                className="flex flex-1 items-center gap-2 rounded-md bg-scan-row-score px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                <GripVertical className="size-3.5 opacity-50" /> Score
              </motion.div>
            </div>

            <motion.div
              initial={{ x: "120%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 2.9, ...DEMO_MOTION.rowSpring }}
              className="flex w-full items-center gap-2 rounded-md bg-scan-row-shots px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <GripVertical className="size-3.5 opacity-50" /> Shots to Green
            </motion.div>

            <motion.div
              initial={{ x: "120%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 3.2, ...DEMO_MOTION.rowSpring }}
              className="flex w-full items-center gap-2 rounded-md bg-scan-row-putts px-3 py-1.5 text-xs font-semibold text-primary-foreground"
            >
              <GripVertical className="size-3.5 opacity-50" /> Putts
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * One capture of the app, the wide one from Tailwind's `sm` (640px) up, where the
 * frame turns square. Decorative, so it has no alt text.
 */
function TourPicture({ screen }: { screen: TourScreen }) {
  return (
    <picture>
      <source media="(min-width: 640px)" srcSet={tourImage(screen, "wide")} />
      <img src={tourImage(screen, "narrow")} alt="" className="block w-full" />
    </picture>
  );
}

const percent = (share: number) => `${share * 100}%`;

/** The handicap's place in each capture, for the tap to land on. */
const TAP_POSITION = {
  "--tap-x": percent(HANDICAP_TAP.narrow.x),
  "--tap-y": percent(HANDICAP_TAP.narrow.y),
  "--tap-x-wide": percent(HANDICAP_TAP.wide.x),
  "--tap-y-wide": percent(HANDICAP_TAP.wide.y),
} as CSSProperties;

/** A finger pressing the dashboard's handicap. */
function HandicapTap() {
  return (
    <div
      style={TAP_POSITION}
      className="absolute top-(--tap-y) left-(--tap-x) -translate-x-1/2 -translate-y-1/2 sm:top-(--tap-y-wide) sm:left-(--tap-x-wide)"
    >
      <motion.div
        initial={{ scale: motionTokens.hoverScale, opacity: 0 }}
        animate={{ scale: [motionTokens.hoverScale, motionTokens.tapScale, 1], opacity: [0, 1, 0.9] }}
        transition={{ duration: DEMO_MOTION.tap, ease: "easeOut" }}
        className="size-12 rounded-full border-2 border-primary bg-primary/20 shadow-card"
      />
    </div>
  );
}

/**
 * The app the scan lands in. Each capture is pinned to the frame's top edge in its
 * own aspect, so the tap's percentages line up with the picture underneath.
 */
function AppScreen({ screen, tapping }: { screen: TourScreen; tapping: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DEMO_MOTION.crossfade }}
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-2xl bg-card"
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={screen}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DEMO_MOTION.screenChange, ease: "easeOut" }}
          className="absolute inset-x-0 top-0 aspect-3/4 sm:aspect-square"
        >
          <TourPicture screen={screen} />
          {tapping && <HandicapTap />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export function ScannerDemo() {
  const { phase, label, scorecard, screen, tapping, tourPrimed } = useScannerDemoViewModel();
  const scanned = phase === "result" || screen !== null;

  return (
    <div className="relative flex aspect-3/4 w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:aspect-11/10 lg:aspect-square">
      <motion.img
        src="/hero/physical-card.jpg"
        alt="A paper golf scorecard being scanned"
        className="absolute inset-0 h-full w-full origin-left object-cover"
        initial={false}
        animate={{
          filter: phase === "mapping" ? "brightness(0.5) blur(3px)" : "brightness(1) blur(0px)",
          opacity: scanned ? 0 : 1,
          scale: scanned ? 0.95 : 1,
        }}
        transition={{ duration: DEMO_MOTION.crossfade }}
      />

      <AnimatePresence>
        {phase === "result" && <DigitalScorecard rows={scorecard} />}
      </AnimatePresence>
      <AnimatePresence>{phase === "mapping" && <MappingPanel />}</AnimatePresence>
      <AnimatePresence>
        {screen && <AppScreen key="app" screen={screen} tapping={tapping} />}
      </AnimatePresence>

      {/* Fetched while the round is on show, so the tour never waits on a download. */}
      {tourPrimed && (
        <div hidden>
          {TOUR_SCREENS.map((tourScreen) => (
            <TourPicture key={tourScreen} screen={tourScreen} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {phase === "scanning" && (
          <motion.div
            initial={{ top: "-20%" }}
            animate={{ top: "120%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: DEMO_MOTION.sweep, ease: "linear" }}
            className="pointer-events-none absolute right-0 left-0 z-30 h-32 border-b-2 border-primary bg-gradient-to-b from-transparent via-primary/10 to-primary/40"
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full whitespace-nowrap bg-foreground/90 px-4 py-2 text-xs font-semibold tracking-chip text-background shadow-card backdrop-blur"
      >
        {phase === "mapping" && <Type className="size-3.5 text-primary" />}
        {phase === "scanning" && <ScanLine className="size-3.5 animate-pulse text-score-birdie" />}
        {scanned && <div className="size-2 rounded-full bg-score-birdie" />}
        {label}
      </motion.div>
    </div>
  );
}
