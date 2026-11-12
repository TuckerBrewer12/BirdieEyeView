import { formatPercent } from "@/domain/format";
import { ShareBar, ShareLegend } from "@/brand/charts/ShareBar";
import { Card } from "@/brand/components/Card";

const hit = [
  { key: "birdie", share: 16, tone: "birdie", label: "Birdie" },
  { key: "par", share: 66, tone: "par", label: "Par" },
  { key: "bogey", share: 18, tone: "bogey", label: "Bogey" },
] as const;

const missed = [
  { key: "par", share: 31, tone: "par", label: "Par" },
  { key: "bogey", share: 50, tone: "bogey", label: "Bogey" },
  { key: "double", share: 18, tone: "double", label: "Double" },
  { key: "triple", share: 1, tone: "triple", label: "Triple+" },
] as const;

const putts = [
  { key: "one", share: 22, tone: "birdie", label: "1 putt" },
  { key: "two", share: 69, tone: "par", label: "2 putts" },
  { key: "three", share: 9, tone: "bogey", label: "3+ putts" },
] as const;

export default function ShareBarPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-3 px-4">
        <div className="text-label font-semibold text-muted-foreground">Tall: shares printed inside, a legend under two bars</div>
        <ShareBar segments={[...hit]} />
        <ShareBar segments={[...missed]} />
        <ShareLegend items={missed.map(({ key, tone, label }) => ({ key, tone, label }))} />
      </Card>
      <Card className="gap-3 px-4">
        <div className="text-label font-semibold text-muted-foreground">Putts a hole, the legend with figures</div>
        <ShareBar segments={[...putts]} />
        <ShareLegend items={putts.map(({ key, tone, label, share }) => ({ key, tone, label, figure: formatPercent(share) }))} />
      </Card>
      <Card className="gap-3 px-4">
        <div className="text-label font-semibold text-muted-foreground">Thin</div>
        <ShareBar size="sm" segments={[...missed]} />
      </Card>
    </div>
  );
}
