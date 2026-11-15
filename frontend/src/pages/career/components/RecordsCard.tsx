import { Bird, ChevronRight, Flag, Flame, Medal, Target, Trophy, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Collection, IconBadge, RowButton, type IconBadgeTone } from "@/brand";
import { cn } from "@/brand/cn";
import type { CareerRecord, RecordKind } from "../model";
import { RECORD_LABEL, eventDetail, recordValue } from "../present";

interface RecordsCardProps {
  records: CareerRecord[];
  onOpenRound: (roundId: string) => void;
  className?: string;
}

const ROW = "flex w-full items-center gap-3 py-2.5 text-left";

const RECORD_MARK: Record<RecordKind, { icon: LucideIcon; tone: IconBadgeTone }> = {
  "lowest-round": { icon: Trophy, tone: "eagle" },
  "most-birdies": { icon: Bird, tone: "birdie" },
  "most-gir": { icon: Target, tone: "primary" },
  "fewest-putts": { icon: Flag, tone: "info" },
  "birdie-streak": { icon: Flame, tone: "birdie" },
  "par-streak": { icon: Medal, tone: "par" },
};

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
            const body = (
              <>
                <IconBadge icon={mark.icon} tone={mark.tone} />
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
