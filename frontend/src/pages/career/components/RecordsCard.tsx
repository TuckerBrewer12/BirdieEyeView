import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Collection } from "@/brand";
import { cn } from "@/brand/cn";
import type { CareerRecord } from "../model";
import { RECORD_LABEL, eventDetail, recordValue } from "../present";

interface RecordsCardProps {
  records: CareerRecord[];
  /** Opens the round a record was set in. */
  onOpenRound: (roundId: string) => void;
  className?: string;
}

const ROW = "flex w-full items-center gap-3 py-2.5 text-left";

/** The golfer's best rounds and streaks over the window, each opening the round it was set in. */
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
            const body = (
              <>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{RECORD_LABEL[record.kind]}</span>
                  <span className="truncate text-xs text-muted-foreground">{eventDetail(record.event) ?? "—"}</span>
                </span>
                <span className="text-lg font-bold tabular-nums text-foreground">{recordValue(record.value)}</span>
                <ChevronRight aria-hidden className={cn("size-4 shrink-0 text-muted-foreground", !roundId && "invisible")} />
              </>
            );
            return roundId ? (
              <button
                type="button"
                data-slot="record-row"
                className={cn(ROW, "rounded-md transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring")}
                onClick={() => onOpenRound(roundId)}
              >
                {body}
              </button>
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
