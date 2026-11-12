import { Card, Stat, StatLabel, StatValue, toParTextClass } from "@/brand";
import type { RecordFigure } from "../courseDetailModel";

/** A figure's to par and when, set small beside it: "+6 · Jun 15", the to par coloured. */
function Detail({ figure }: { figure: RecordFigure }) {
  if (!figure.toPar && !figure.note) return null;
  return (
    <span className="text-caption font-bold whitespace-nowrap text-muted-foreground">
      {figure.toPar && <span className={toParTextClass(figure.toPar.value)}>{figure.toPar.label}</span>}
      {figure.toPar && figure.note && " · "}
      {figure.note}
    </span>
  );
}

/**
 * The golfer's record at a course: rounds played, their average, best and worst. Two by two on a wide
 * screen, each figure over its label; on a phone a list, each label beside its figure.
 */
export function CourseRecordCard({ figures }: { figures: RecordFigure[] }) {
  return (
    <Card
      data-slot="course-record"
      className="gap-0 divide-y divide-border px-4 py-1 md:grid md:grid-cols-2 md:gap-x-3 md:gap-y-4 md:divide-y-0 md:px-5 md:py-4"
    >
      {figures.map((figure) => (
        <div
          key={figure.label}
          className="flex items-baseline justify-between gap-3 py-3 md:flex-col md:items-start md:justify-start md:gap-1 md:py-0"
        >
          <StatLabel tone="quiet" className="text-body md:text-caption">
            {figure.label}
          </StatLabel>
          <Stat className="flex-row items-baseline gap-2">
            <StatValue size="summary">{figure.value}</StatValue>
            <Detail figure={figure} />
          </Stat>
        </div>
      ))}
    </Card>
  );
}
