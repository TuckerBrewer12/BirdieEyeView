import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/brand/cn";
import { narrativeTone, type Narrative, type NarrativeTone } from "../present";

const ICON: Record<Narrative["trend"], typeof Minus> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const TONE_CLASS: Record<NarrativeTone, string> = {
  good: "text-score-birdie",
  bad: "text-score-bogey",
  neutral: "text-muted-foreground",
};

interface InsightNoteProps {
  narrative: Narrative;
  className?: string;
}

/** One sentence about a part of the game, with an arrow coloured by whether the move is good. */
export function InsightNote({ narrative, className }: InsightNoteProps) {
  const Icon = ICON[narrative.trend];
  return (
    <div data-slot="insight-note" className={cn("flex items-start gap-3 rounded-xl bg-primary/trace px-3 py-2", className)}>
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", TONE_CLASS[narrativeTone(narrative)])} />
      <p className="text-sm leading-relaxed text-muted-foreground">{narrative.text}</p>
    </div>
  );
}
