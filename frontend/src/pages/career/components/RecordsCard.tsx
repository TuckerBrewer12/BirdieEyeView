import { Bird, ChevronRight, Flag, Flame, Medal, Target, Trophy, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Collection, RowButton } from "@/brand";
import { cn } from "@/brand/cn";
import type { CareerRecord, RecordKind } from "../model";
import { RECORD_LABEL, eventDetail, recordValue } from "../present";

interface RecordsCardProps {
  records: CareerRecord[];
  /** Opens the round a record was set in. */
  onOpenRound: (roundId: string) => void;
  className?: string;
}

const ROW = "flex w-full items-center gap-3 py-2.5 text-left";

/**
 * Each record's mark: an icon on a light wash in the colour of what it counts. Scoring records take
 * their score's colour (the lowest round the eagle's gold, birdies green, a par streak par's grey),
 * greens the brand green, putts the putts row's blue from the scorecard.
 */
const RECORD_MARK: Record<RecordKind, { icon: LucideIcon; wash: string }> = {
  "lowest-round": { icon: Trophy, wash: "bg-score-eagle-muted text-score-eagle-on-muted" },
  "most-birdies": { icon: Bird, wash: "bg-score-birdie-muted text-score-birdie-on-muted" },
  "most-gir": { icon: Target, wash: "bg-primary/tint text-primary" },
  "fewest-putts": { icon: Flag, wash: "bg-scan-row-putts/tint text-scan-row-putts" },
  "birdie-streak": { icon: Flame, wash: "bg-score-birdie-muted text-score-birdie-on-muted" },
  "par-streak": { icon: Medal, wash: "bg-score-par-muted text-score-par-on-muted" },
};

/** The golfer's best rounds and streaks over the window, each marked in its colour and opening the round it was set in. */
export function RecordsCard({ records, onOpenRound, className }: RecordsCardProps) {
  return (
    <Card data-slot="records-card" className={className}>
      <CardHeader>
        <CardTitle>Round Records</CardTitle>
      </CardHeader>
      <CardContent>
        <Collection
          layout="divided"
          items={records}
          keyFor={(record) => record.kind}
          renderItem={(record) => {
            const roundId = record.event?.roundId ?? null;
            const mark = RECORD_MARK[record.kind];
            const Icon = mark.icon;
            const body = (
              <>
                <span
                  aria-hidden
                  data-slot="record-mark"
                  className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", mark.wash)}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{RECORD_LABEL[record.kind]}</span>
                  <span className="truncate text-xs text-muted-foreground">{eventDetail(record.event) ?? "—"}</span>
                </span>
                <span className="text-lg font-bold tabular-nums text-foreground">{recordValue(record.value)}</span>
                <ChevronRight aria-hidden className={cn("size-4 shrink-0 text-muted-foreground", !roundId && "invisible")} />
              </>
            );
            return roundId ? (
              <RowButton
                data-slot="record-row"
                className={cn(ROW, "rounded-md hover:bg-muted/strong focus-visible:outline-2 focus-visible:outline-ring")}
                onClick={() => onOpenRound(roundId)}
              >
                {body}
              </RowButton>
            ) : (
              <div data-slot="record-row" className={ROW}>
                {body}
              </div>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}
