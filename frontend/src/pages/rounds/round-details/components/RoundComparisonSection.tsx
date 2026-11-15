import { Card, CardAction, CardContent, CardHeader, CardTitle, StatDelta, ToggleGroup, ToggleGroupItem } from "@/brand";
import { formatOneDecimal, formatSigned, formatTwoDecimals, formatWhole } from "@/domain";
import type { ComparisonRow } from "../roundDetailModel";
import { useRoundComparisonViewModel } from "./useRoundComparisonViewModel";

function comparedValue(row: ComparisonRow): string {
  return row.metric === "putts_per_gir" ? formatTwoDecimals(row.value) : formatWhole(row.value);
}

function comparedAverage(row: ComparisonRow): string {
  return row.metric === "putts_per_gir" ? formatTwoDecimals(row.average) : formatOneDecimal(row.average);
}

function comparedDifference(row: ComparisonRow): string {
  return formatSigned(row.difference, row.metric === "putts_per_gir" ? 2 : 1);
}

interface RoundComparisonSectionProps {
  userId: string;
  roundId: string;
  className?: string;
}

export function RoundComparisonSection({ userId, roundId, className }: RoundComparisonSectionProps) {
  const viewModel = useRoundComparisonViewModel(userId, roundId);
  if (!viewModel.show) return null;

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
            onValueChange={(values: string[]) => viewModel.pickWindow(values[0])}
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
        {viewModel.metrics.length === 0 ? (
          <p className="text-body text-muted-foreground">No earlier rounds to compare with yet.</p>
        ) : (
          <dl className="-mt-1 flex flex-col">
            {viewModel.metrics.map((metric) => (
              <div
                key={metric.metric}
                className="grid grid-cols-versus-row items-baseline gap-2 border-t border-border py-2.5 text-sm"
              >
                <dt className="text-foreground-secondary">{metric.label}</dt>
                <dd className="text-right font-semibold text-foreground">{comparedValue(metric)}</dd>
                <dd className="text-right text-muted-foreground">{comparedAverage(metric)}</dd>
                <dd className="text-right">
                  <StatDelta direction={metric.direction} tone={metric.verdict} glyph={false} className="text-body">
                    {comparedDifference(metric)}
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
