import type { CSSProperties } from "react";
import { ScanLine, Type } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardFactsForm, RoundPreview } from "@/brand";
import { tokens } from "@/brand/theme";
import type { CardFacts } from "@/domain/scan";
import { SAMPLE_ROUND } from "../sampleRound";
import { HANDICAP_TAP, TOUR_SCREENS, WIDE_FRAME_MEDIA, tourImage, type TourScreen } from "./demoTour";
import { useScannerDemoViewModel } from "./useScannerDemoViewModel";

const DEMO_MOTION = tokens.motion.demo;

const DEMO_FACTS: CardFacts = {
  name: "T",
  writtenAs: "toPar",
  putts: true,
  shotsToGreen: true,
  rowOrder: ["score", "shots", "putts"],
  nameRow: "score",
};

const noop = () => {};

function SetupPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: DEMO_MOTION.recedeScale }}
      inert
      className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4 pt-4 pb-16 sm:px-6"
    >
      <Card className="w-full max-w-md max-sm:scale-80">
        <CardContent>
          <CardFactsForm card={DEMO_FACTS} onChange={noop} idPrefix="demo" />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ReadRound() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: DEMO_MOTION.crossfade }}
      className="pointer-events-none absolute inset-x-4 bottom-16 z-10 sm:inset-x-8"
    >
      <Card data-slot="sample-round">
        <CardContent>
          <RoundPreview variant="summary" holes="strip" frame="none" round={SAMPLE_ROUND} />
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TourPicture({ screen }: { screen: TourScreen }) {
  return (
    <picture>
      <source media={WIDE_FRAME_MEDIA} srcSet={tourImage(screen, "wide")} />
      <img src={tourImage(screen, "narrow")} alt="" className="block w-full" />
    </picture>
  );
}

const percent = (share: number) => `${share * 100}%`;

const TAP_POSITION = {
  "--tap-x": percent(HANDICAP_TAP.narrow.x),
  "--tap-y": percent(HANDICAP_TAP.narrow.y),
  "--tap-x-wide": percent(HANDICAP_TAP.wide.x),
  "--tap-y-wide": percent(HANDICAP_TAP.wide.y),
} as CSSProperties;

function HandicapTap() {
  return (
    <div
      style={TAP_POSITION}
      className="absolute top-(--tap-y) left-(--tap-x) -translate-x-1/2 -translate-y-1/2 sm:top-(--tap-y-wide) sm:left-(--tap-x-wide)"
    >
      <motion.div
        initial={{ scale: DEMO_MOTION.tap.reachScale, opacity: 0 }}
        animate={{
          scale: [DEMO_MOTION.tap.reachScale, DEMO_MOTION.tap.pressScale, 1],
          opacity: [0, 1, 0.9],
        }}
        transition={{ duration: DEMO_MOTION.tap.duration, ease: "easeOut" }}
        className="size-12 rounded-full border-2 border-primary bg-primary/wash shadow-card"
      />
    </div>
  );
}

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
          initial={{ opacity: 0, scale: DEMO_MOTION.screenEnterScale }}
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
  const { phase, label, screen, tapping, tourPrimed } = useScannerDemoViewModel();
  const scanned = phase === "result" || screen !== null;
  const touring = screen !== null;

  return (
    <div
      data-slot="scanner-demo"
      className="relative flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-2xl bg-muted sm:aspect-11/10 md:rounded-3xl lg:aspect-square"
    >
      <motion.img
        src="/hero/physical-card.jpg"
        alt="A paper scorecard held over a golf cart"
        className="absolute inset-0 h-full w-full origin-left object-cover"
        initial={false}
        animate={{
          filter: phase === "mapping" ? `brightness(0.5) blur(${tokens.blur.xs}px)` : "brightness(1) blur(0px)",
          opacity: touring ? 0 : 1,
          scale: touring ? DEMO_MOTION.recedeScale : 1,
        }}
        transition={{ duration: DEMO_MOTION.crossfade }}
      />

      <AnimatePresence>
        {phase === "result" && <ReadRound />}
      </AnimatePresence>
      <AnimatePresence>{phase === "mapping" && <SetupPanel />}</AnimatePresence>
      <AnimatePresence>
        {screen && <AppScreen key="app" screen={screen} tapping={tapping} />}
      </AnimatePresence>

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
            className="pointer-events-none absolute right-0 left-0 z-30 h-32 border-b-2 border-primary bg-gradient-to-b from-transparent via-primary/tint to-primary/recessed"
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="absolute bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full whitespace-nowrap bg-foreground/glass px-4 py-2 text-xs font-semibold tracking-chip text-background shadow-card backdrop-blur"
      >
        {phase === "mapping" && <Type className="size-3.5 text-primary" />}
        {phase === "scanning" && <ScanLine className="size-3.5 animate-pulse text-score-birdie" />}
        {scanned && <div className="size-2 rounded-full bg-score-birdie" />}
        {label}
      </motion.div>
    </div>
  );
}
