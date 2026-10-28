import { PageTitle, Stat, StatDelta, StatLabel, StatValue } from "@/brand";
import { formatHandicapIndex } from "@/domain";

interface GreetingHeaderProps {
  firstName: string;
  /** "Mon · Jun 15". */
  dateLabel: string;
  handicapIndex: number | null;
  /** How the index moved over the last six rated rounds; negative is an improvement. */
  handicapChange: number | null;
  onHandicapClick: () => void;
}

/** The phone dashboard's top line: today, a hello, and the handicap that opens its breakdown. */
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
      <button
        type="button"
        onClick={onHandicapClick}
        className="cursor-pointer rounded-lg p-1 text-right hover:bg-muted"
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
      </button>
    </div>
  );
}
