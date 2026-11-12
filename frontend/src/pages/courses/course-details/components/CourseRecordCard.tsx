import { ChevronRight } from "lucide-react";
import { Card, RowButton, Stat, StatLabel, StatValue, ToParFigure } from "@/brand";
import { cn } from "@/brand/cn";
import type { RecordFigure } from "../courseDetailModel";

/** A figure's to par and when, set small beside it: "+6 · Jun 15", the to par coloured. */
function Detail({ figure }: { figure: RecordFigure }) {
  if (!figure.toPar && !figure.note) return null;
  return (
    <span className="text-caption font-bold whitespace-nowrap text-muted-foreground">
      {figure.toPar && <ToParFigure toPar={figure.toPar.value} label={figure.toPar.label} size="inherit" />}
      {figure.toPar && figure.note && " · "}
      {figure.note}
    </span>
  );
}

const ROW =
  "flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left md:flex-col md:items-start md:justify-start md:gap-1 md:rounded-2xl md:px-3 md:py-2.5";

function Figure({ figure }: { figure: RecordFigure }) {
  return (
    <>
      <StatLabel tone="quiet" className="text-body md:text-caption">
        {figure.label}
      </StatLabel>
      <Stat className="flex-row items-baseline gap-2">
        <StatValue size="summary">{figure.value}</StatValue>
        <Detail figure={figure} />
        {figure.roundId && <ChevronRight aria-hidden className="size-3.5 self-center text-muted-foreground" />}
      </Stat>
    </>
  );
}

/**
 * The golfer's record at a course: rounds played, their average, best and worst. Two by two on a wide
 * screen, each figure over its label; on a phone a list, each label beside its figure. The best and
 * worst open their round.
 */
export function CourseRecordCard({
  figures,
  onOpenRound,
}: {
  figures: RecordFigure[];
  onOpenRound: (roundId: string) => void;
}) {
  return (
    <Card
      data-slot="course-record"
      // Beside a taller card the record keeps its figures together at the top, rather than spread down it.
      className="gap-0 divide-y divide-border py-1 md:grid md:grid-cols-2 md:content-start md:gap-1 md:divide-y-0 md:p-2"
    >
      {figures.map((figure) => {
        const { roundId } = figure;
        return roundId ? (
          <RowButton
            key={figure.label}
            className={cn(ROW, "cursor-pointer hover:bg-muted/half")}
            onClick={() => onOpenRound(roundId)}
          >
            <Figure figure={figure} />
          </RowButton>
        ) : (
          <div key={figure.label} className={ROW}>
            <Figure figure={figure} />
          </div>
        );
      })}
    </Card>
  );
}
