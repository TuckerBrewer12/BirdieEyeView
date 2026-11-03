import { Button, PageTitle, Stat, StatDelta, StatLabel, StatValue } from "@/brand";
import { formatHandicapIndex } from "@/domain";

interface GreetingHeaderProps {
  firstName: string;
  dateLabel: string;
  handicapIndex: number | null;
  handicapChange: number | null;
  onHandicapClick: () => void;
}

export function GreetingHeader({
  firstName,
  dateLabel,
  handicapIndex,
  handicapChange,
  onHandicapClick,
}: GreetingHeaderProps) {
  const moved = handicapChange != null && handicapChange !== 0;

  return (
    <div data-slot="greeting-header" className="flex items-start justify-between gap-4 px-1">
      <div>
        <div className="mb-1 text-label font-semibold uppercase tracking-eyebrow text-muted-foreground">
          {dateLabel}
        </div>
        <PageTitle size="compact">Hi {firstName}</PageTitle>
      </div>
      <Button
        variant="ghost"
        onClick={onHandicapClick}
        className="h-auto cursor-pointer p-1 text-right"
      >
        <Stat align="end">
          <StatLabel>Handicap</StatLabel>
          <StatValue size="md">{formatHandicapIndex(handicapIndex)}</StatValue>
          {moved && (
            <StatDelta direction={handicapChange < 0 ? "down" : "up"}>
              {Math.abs(handicapChange).toFixed(1)}
            </StatDelta>
          )}
        </Stat>
      </Button>
    </div>
  );
}
