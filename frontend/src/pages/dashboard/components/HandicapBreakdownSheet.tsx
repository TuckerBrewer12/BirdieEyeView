import { Check, ChevronDown, X } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  useFromBreakpoint,
} from "@/brand";
import { cn } from "@/brand/cn";
import { formatHandicapIndex, formatOneDecimal } from "@/domain";
import type { ChangeVerdict, WhsBreakdown, WhsRound } from "../model";
import { MoveDelta } from "./MoveDelta";
import {
  adjustmentLabel,
  courseLabelForWhs,
  differentialLabel,
  ratingLabelForWhs,
  scoreAndRatingForWhs,
  whsContextNote,
  windowFillLabel,
} from "../present";

interface HandicapBreakdownSheetProps {
  open: boolean;
  onClose: () => void;
  handicapIndex: number | null | undefined;
  /** How far the index moved this month, and the server's verdict on it. */
  handicapChange: number | null;
  handicapVerdict: ChangeVerdict | null;
  whs: WhsBreakdown;
}

/**
 * How the handicap index was reached: the index, the window's rounds and which of them count.
 * A panel from the right on a wide screen, a sheet from the bottom on a phone.
 */
export function HandicapBreakdownSheet({
  open,
  onClose,
  handicapIndex,
  handicapChange,
  handicapVerdict,
  whs,
}: HandicapBreakdownSheetProps) {
  const wide = useFromBreakpoint("md");
  const { rows, windowSize, countUsed, adjustment, diffAvg, hasRatedRounds } = whs;
  const adjustmentText = adjustmentLabel(adjustment);
  const stats = [
    { value: windowFillLabel(windowSize), label: "Rounds so far" },
    { value: String(countUsed), label: "Best used" },
    { value: formatOneDecimal(diffAvg), label: wide ? "Avg differential" : "Avg diff" },
  ];

  const index = (
    <div className="flex items-baseline gap-2.5">
      <span className="text-hero leading-none font-semibold text-foreground">{formatHandicapIndex(handicapIndex)}</span>
      <MoveDelta change={handicapChange} verdict={handicapVerdict} className="text-body font-semibold" />
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent
        side={wide ? "right" : "bottom"}
        showCloseButton={false}
        className="h-sheet-tall gap-4 overflow-y-auto rounded-t-sheet px-5 pt-2.5 pb-8 md:h-full md:max-w-sheet md:gap-5 md:rounded-none md:border-l-0 md:p-6 md:shadow-card"
      >
        {wide ? (
          <>
            <div className="flex items-center justify-between">
              <SheetTitle className="text-body-lg font-semibold">Handicap index</SheetTitle>
              <SheetClose render={<Button variant="ghost" size="icon" aria-label="Close" />}>
                <X />
              </SheetClose>
            </div>
            {index}
          </>
        ) : (
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <SheetTitle className="text-body font-semibold text-foreground-secondary">Handicap index</SheetTitle>
              {index}
            </div>
            <SheetClose render={<Button variant="secondary" size="icon-sm" shape="pill" aria-label="Close" />}>
              <X />
            </SheetClose>
          </div>
        )}

        <Card className="grid auto-cols-fr grid-flow-col gap-0 py-0">
          {stats.map((stat) => (
            <div key={stat.label} className="px-3.5 py-3 not-first:border-l not-first:border-border">
              <div className="text-lg font-semibold text-foreground">{stat.value}</div>
              <div className="mt-0.5 text-label text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </Card>

        {!hasRatedRounds && (
          <Alert>
            <AlertDescription>
              These rounds have no course rating or slope, so each differential is the score to par.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col">
          {wide && rows.length > 0 && (
            <div className="flex justify-between px-0.5 pb-2 text-label font-semibold text-muted-foreground">
              <span>Round</span>
              <span className="flex gap-7">
                <span>Score</span>
                <span>Diff</span>
                <span className="w-icon-md" />
              </span>
            </div>
          )}
          {rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No rounds yet</div>
          ) : (
            rows.map((row) => <WhsRow key={row.roundIndex} row={row} />)
          )}
        </div>

        <Collapsible>
          <CollapsibleTrigger
            render={<Button variant="link" size="sm" className="group self-start px-0" />}
          >
            How it’s calculated
            <ChevronDown aria-hidden className="size-3 transition-transform group-data-panel-open:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-3 pt-2 text-body-sm text-foreground-secondary">
              <p>Each round’s differential is (score − course rating) × 113 ÷ slope rating.</p>
              <p>{whsContextNote(countUsed)}</p>
              {adjustmentText && (
                <p>
                  With only {windowSize} rounds, the index takes a {adjustmentText} adjustment until there are
                  more.
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </SheetContent>
    </Sheet>
  );
}

/** One round in the window: where, its rating, its score and differential, and whether it counts. */
function WhsRow({ row }: { row: WhsRound }) {
  return (
    <div className="flex items-center gap-3 border-t border-border py-3 first:border-t-0 md:px-0.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-body-lg font-semibold text-foreground md:text-sm">{courseLabelForWhs(row)}</div>
        {/* The phone has no score column, so its line under the course carries the score. */}
        <div className="text-body-sm text-muted-foreground md:hidden">{scoreAndRatingForWhs(row)}</div>
        <div className="hidden text-body-sm text-muted-foreground md:block">{ratingLabelForWhs(row)}</div>
      </div>
      <div className="hidden w-10 text-right text-sm font-semibold text-foreground md:block">{row.score ?? "—"}</div>
      <div
        className={cn(
          "text-right text-body-lg md:w-12 md:text-sm",
          row.used ? "font-bold text-foreground" : "font-medium text-muted-foreground",
        )}
      >
        {differentialLabel(row.differential)}
      </div>
      <span
        aria-label={row.used ? "Counts toward index" : "Not counted"}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full md:size-icon-md",
          row.used ? "bg-primary text-primary-foreground" : "border border-border-strong",
        )}
      >
        {row.used && <Check aria-hidden className="size-2.5 stroke-3" />}
      </span>
    </div>
  );
}
