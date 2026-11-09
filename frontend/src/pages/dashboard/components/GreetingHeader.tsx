import { RowButton, StatDelta } from "@/brand";
import { formatHandicapIndex } from "@/domain";
import type { ChangeVerdict } from "../model";
import { moveOf } from "../present";

interface GreetingHeaderProps {
  greeting: string;
  handicapIndex: number | null;
  /** How far the index moved across the picked window. */
  handicapChange: number | null;
  handicapVerdict: ChangeVerdict | null;
  onHandicapClick: () => void;
}

/** The phone's top line: the greeting, and the handicap index that opens its breakdown. */
export function GreetingHeader({
  greeting,
  handicapIndex,
  handicapChange,
  handicapVerdict,
  onHandicapClick,
}: GreetingHeaderProps) {
  const move = moveOf(handicapChange);
  const index = formatHandicapIndex(handicapIndex);
  return (
    <div data-slot="greeting-header" className="flex items-center justify-between gap-3">
      <h1 className="text-title font-semibold text-foreground">{greeting}</h1>
      <RowButton
        aria-label={`Handicap ${index}. Open details`}
        onClick={onHandicapClick}
        className="flex cursor-pointer flex-col items-end py-1"
      >
        <span className="text-label font-medium text-muted-foreground">Handicap</span>
        <span className="mt-0.5 flex items-baseline gap-1.5">
          <StatDelta direction={move.direction} tone={handicapVerdict ?? "neutral"} className="text-label">
            {move.amount}
          </StatDelta>
          <span className="text-2xl leading-none font-semibold tracking-title text-foreground">{index}</span>
        </span>
      </RowButton>
    </div>
  );
}
