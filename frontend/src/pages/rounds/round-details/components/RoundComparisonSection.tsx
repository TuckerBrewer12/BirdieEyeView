import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  StatDelta,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { comparisonFrom } from "../roundDetailModel";
import { useRoundComparisonViewModel } from "./useRoundComparisonViewModel";

interface RoundComparisonSectionProps {
  userId: string;
  roundId: string;
  className?: string;
}

/** "vs your average": each figure of this round beside the golfer's average and the difference. */
export function RoundComparisonSection({
  userId,
  roundId,
  className,
}: RoundComparisonSectionProps) {
  const viewModel = useRoundComparisonViewModel(userId, roundId);
  if (!viewModel.show || viewModel.comparison == null) return null;
  const rows = comparisonFrom(viewModel.comparison)[viewModel.window]?.rows ?? [];

  return (
    <Card data-slot="round-comparison" size="lg" className={className}>
      <CardHeader className="items-center">
        <CardTitle level={2} className="text-body-lg font-semibold">
          vs your average
        </CardTitle>
        <CardAction className="self-center">
          <ToggleGroup
            size="sm"
            aria-label="Compare with"
            value={[viewModel.window]}
            onValueChange={(values: string[]) =>
              viewModel.pickWindow(values[0])
            }
          >
            {viewModel.windows.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-body text-muted-foreground">
            No earlier rounds to compare with yet.
          </p>
        ) : (
          <dl className="-mt-1 flex flex-col">
            {rows.map((row) => (
              <div
                key={row.metric}
                className="grid grid-cols-versus-row items-baseline gap-2 border-t border-border py-2.5 text-sm"
              >
                <dt className="text-foreground-secondary">{row.label}</dt>
                <dd className="text-right font-semibold text-foreground">
                  {row.value}
                </dd>
                <dd className="text-right text-muted-foreground">
                  {row.average}
                </dd>
                <dd className="text-right">
                  <StatDelta
                    direction={row.direction}
                    tone={row.verdict}
                    glyph={false}
                    className="text-body"
                  >
                    {row.difference}
                  </StatDelta>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
