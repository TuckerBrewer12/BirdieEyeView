import { Card, PageTitle, RowButton, Sparkline, StatValue } from "@/brand";
import { formatHandicapIndex, moveOf } from "@/domain";
import type { HandicapMonth } from "../model";
import { MoveDelta } from "./MoveDelta";

interface GreetingHeaderProps {
  greeting: string;
  name: string;
  handicap: HandicapMonth;
  handicapLine: (number | null)[];
  onHandicapClick: () => void;
  compact?: boolean;
}

export function GreetingHeader({ greeting, name, handicap, handicapLine, onHandicapClick, compact = false }: GreetingHeaderProps) {
  const move = moveOf(handicap.change);
  const index = formatHandicapIndex(handicap.index);
  const label = `Handicap ${index}. Open the breakdown`;

  if (compact) {
    return (
      <div data-slot="greeting-header" className="flex items-center justify-between gap-3 pl-1">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">{greeting}</div>
          <PageTitle size="figure">{name}</PageTitle>
        </div>
        <Card
          render={<RowButton aria-label={label} onClick={onHandicapClick} />}
          interactive
          className="min-h-16 shrink-0 flex-row items-center gap-3 py-3 pr-3.5 pl-4"
        >
          <span className="flex flex-col">
            <span className="text-body-sm text-muted-foreground">Handicap</span>
            <span className="flex items-baseline gap-1.5">
              <StatValue size="card-sm">{index}</StatValue>
              <MoveDelta change={handicap.change} verdict={handicap.verdict} className="font-semibold" />
            </span>
          </span>
          <Sparkline size="mini" series={[{ values: handicapLine, tone: "index" }]} />
        </Card>
      </div>
    );
  }

  return (
    <div data-slot="greeting-header">
      <PageTitle size="heading">{`${greeting}, ${name}`}</PageTitle>
      <RowButton
        aria-label={label}
        onClick={onHandicapClick}
        className="mt-1 flex cursor-pointer items-baseline gap-1 text-body-lg text-foreground-secondary hover:text-foreground"
      >
        Handicap <b className="font-semibold text-foreground">{index}</b>
        {move.direction && (
          <>
            <MoveDelta change={handicap.change} verdict={handicap.verdict} className="text-body-lg font-semibold" />
            <span>this month</span>
          </>
        )}
      </RowButton>
    </div>
  );
}
