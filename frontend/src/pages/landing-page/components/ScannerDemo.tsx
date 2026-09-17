import { ScanLine, Type, GripVertical, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { motion as motionTokens } from "@/brand/theme";
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
                className="inline-block h-5 w-5 rounded-sm leading-5 text-primary-foreground sm:h-6 sm:w-6 sm:leading-6"
                style={{ background: row.fill }}
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
              {row.toPar}
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
      exit={{ opacity: 0, scale: motionTokens.tapScale }}
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4 sm:p-6"
    >
      <div className="flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-card font-sans shadow-card">
        <div className="border-b border-border p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-bold text-foreground">What's on your card?</h3>

          <div className="mb-4">
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

          <div className="mb-4">
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

          <div className="mb-4">
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

        <div className="overflow-hidden bg-muted p-4 sm:p-5">
          <div className="relative mb-4 flex flex-col gap-2">
            <div className="relative flex gap-2">
              <div className="z-10 flex w-16 items-center justify-center rounded-md bg-demo-row-name text-xs font-bold text-primary-foreground shadow-card">
                NAME
              </div>
              <motion.div
                initial={{ x: "120%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 2.6, ...DEMO_MOTION.rowSpring }}
                className="flex flex-1 items-center gap-2 rounded-md bg-demo-row-score px-3 py-2 text-xs font-semibold text-primary-foreground"
              >
                <GripVertical className="size-3.5 opacity-50" /> Score
              </motion.div>
            </div>

            <motion.div
              initial={{ x: "120%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 2.9, ...DEMO_MOTION.rowSpring }}
              className="flex w-full items-center gap-2 rounded-md bg-demo-row-shots px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <GripVertical className="size-3.5 opacity-50" /> Shots to Green
            </motion.div>

            <motion.div
              initial={{ x: "120%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 3.2, ...DEMO_MOTION.rowSpring }}
              className="flex w-full items-center gap-2 rounded-md bg-demo-row-putts px-3 py-2 text-xs font-semibold text-primary-foreground"
            >
              <GripVertical className="size-3.5 opacity-50" /> Putts
            </motion.div>
          </div>

          <motion.div
            initial={{ scale: 1 }}
            animate={{ scale: [1, 0.95, 1] }}
            transition={{ delay: 3.8, duration: DEMO_MOTION.emphasis }}
            className="flex items-center justify-center gap-2 rounded-md bg-demo-row-score py-3 text-center text-sm font-bold text-primary-foreground shadow-card"
          >
            <ScanLine className="size-4" /> Extract Scorecard
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

export function ScannerDemo() {
  const { phase, label, scorecard } = useScannerDemoViewModel();

  return (
    <div className="perspective-1000 relative flex aspect-[4/3] w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl border border-border bg-card shadow-card sm:aspect-[1.1]">
      <motion.img
        src="/hero/physical-card.jpg"
        alt="A paper golf scorecard being scanned"
        className="absolute inset-0 h-full w-full origin-left object-cover"
        initial={false}
        animate={{
          filter: phase === "mapping" ? "brightness(0.5) blur(3px)" : "brightness(1) blur(0px)",
          opacity: phase === "result" ? 0 : 1,
          scale: phase === "result" ? 0.95 : 1,
        }}
        transition={{ duration: DEMO_MOTION.crossfade }}
      />

      <AnimatePresence>
        {phase === "result" && <DigitalScorecard rows={scorecard} />}
      </AnimatePresence>
      <AnimatePresence>{phase === "mapping" && <MappingPanel />}</AnimatePresence>

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
        className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground/90 px-4 py-2 text-xs font-semibold tracking-chip text-background shadow-card backdrop-blur"
      >
        {phase === "mapping" && <Type className="size-3.5 text-primary" />}
        {phase === "scanning" && <ScanLine className="size-3.5 animate-pulse text-score-birdie" />}
        {phase === "result" && <div className="size-2 rounded-full bg-score-birdie" />}
        {label}
      </motion.div>
    </div>
  );
}
