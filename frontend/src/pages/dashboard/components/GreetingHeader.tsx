import { RowButton, Sparkline, StatDelta } from "@/brand";
import { cn } from "@/brand/cn";
import { formatHandicapIndex } from "@/domain";
import type { HandicapMonth } from "../model";
import { moveOf } from "../present";
import { SURFACE } from "./DashboardCards";

interface GreetingHeaderProps {
  /** "Good evening". */
  greeting: string;
  name: string;
  handicap: HandicapMonth;
  /** The index after each round, oldest first: the phone card's line. */
  handicapLine: (number | null)[];
  onHandicapClick: () => void;
  /** The phone's: the name under the greeting, the handicap as a card beside it. */
  compact?: boolean;
}

/** The dashboard's top: who it's for, and the handicap index that opens its breakdown. */
export function GreetingHeader({ greeting, name, handicap, handicapLine, onHandicapClick, compact = false }: GreetingHeaderProps) {
  const move = moveOf(handicap.change);
  const index = formatHandicapIndex(handicap.index);
  const delta = (className: string) => (
    <StatDelta
      direction={move.direction}
      tone={handicap.verdict ?? "neutral"}
      className={cn("font-semibold", handicap.verdict === "good" && "text-primary", className)}
    >
      {move.amount}
    </StatDelta>
  );
  const label = `Handicap ${index}. Open the breakdown`;

  if (compact) {
    return (
      <div data-slot="greeting-header" className="flex items-center justify-between gap-3 pl-1">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{greeting}</div>
          <h1 className="truncate text-figure-sm leading-tight tracking-title">{name}</h1>
        </div>
        <RowButton
          aria-label={label}
          onClick={onHandicapClick}
          className={cn(SURFACE, "flex min-h-16 cursor-pointer items-center gap-3 py-3 pr-3.5 pl-4 hover:shadow-card")}
        >
          <span className="flex flex-col">
            <span className="text-body-sm text-muted-foreground">Handicap</span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-3xl leading-none font-semibold tracking-display">{index}</span>
              {delta("text-body-sm")}
            </span>
          </span>
          <Sparkline size="mini" series={[{ values: handicapLine, tone: "index" }]} />
        </RowButton>
      </div>
    );
  }

  return (
    <div data-slot="greeting-header">
      <h1 className="text-greeting">{`${greeting}, ${name}`}</h1>
      <RowButton
        aria-label={label}
        onClick={onHandicapClick}
        className="mt-1 flex cursor-pointer items-baseline gap-1 text-body-lg text-foreground-secondary hover:text-foreground"
      >
        Handicap <b className="font-semibold text-foreground">{index}</b>
        {move.direction && (
          <>
            {delta("text-body-lg")}
            <span>this month</span>
          </>
        )}
      </RowButton>
    </div>
  );
}
