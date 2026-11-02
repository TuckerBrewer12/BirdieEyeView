import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Sparkline,
  Stat,
  StatLabel,
  StatValue,
} from "@/brand";
import { formatOneDecimal, formatPercent } from "@/domain";
import type { PuttingSummary } from "../model";

/** Three-putts and putts a round over the last 20 rounds, and the putts trend. */
export function PuttingCard({ putting, className }: { putting: PuttingSummary; className?: string }) {
  const noData = putting.threePuttsPerRound == null && putting.puttsPerRound == null;

  return (
    <Card data-slot="putting-card" className={className}>
      <CardHeader>
        <CardTitle>Putting Deep Dive</CardTitle>
        <CardDescription>{noData ? "Log putts to unlock this." : "Last 20 rounds"}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {noData ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No putting data yet</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat align="center" className="rounded-xl bg-muted p-3">
                <StatValue>{formatOneDecimal(putting.threePuttsPerRound)}</StatValue>
                <StatLabel>3-Putts / Round</StatLabel>
              </Stat>
              <Stat align="center" className="rounded-xl bg-muted p-3">
                <StatValue>
                  {formatPercent(putting.threePuttRate)}
                </StatValue>
                <StatLabel>3-Putt Rate</StatLabel>
              </Stat>
              <Stat align="center" className="rounded-xl bg-muted p-3">
                <StatValue>{formatOneDecimal(putting.puttsPerRound)}</StatValue>
                <StatLabel>Avg Putts</StatLabel>
              </Stat>
            </div>
            {putting.puttsTrend.filter((putts) => putts != null).length >= 3 && (
              <div className="flex flex-col gap-2 border-t border-border pt-3">
                <span className="text-meta font-bold uppercase tracking-eyebrow text-muted-foreground">
                  Putts per round
                </span>
                <Sparkline series={[{ values: putting.puttsTrend }]} fill mean />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
