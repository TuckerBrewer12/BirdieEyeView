import { ComparisonBars } from "@/brand/charts/ComparisonBars";
import { Card } from "@/brand/components/Card";
import { formatAverageToPar } from "@/domain/score";

export default function ComparisonBarsPreview() {
  return (
    <div className="flex flex-col gap-3">
      <Card className="gap-3 px-4">
        <div className="text-label font-semibold text-muted-foreground">Comparison bars · tick = target</div>
        <ComparisonBars
          format={formatAverageToPar}
          bars={[
            { label: "Par 3", value: 0.62, target: 0.63 },
            { label: "Par 4", value: 0.58, target: 0.75 },
            { label: "Par 5", value: 0.64, target: 0.5 },
          ]}
        />
      </Card>
      <Card className="gap-3 px-4">
        <div className="text-label font-semibold text-muted-foreground">Higher is better</div>
        <ComparisonBars
          better="higher"
          max={100}
          format={(value) => `${value}%`}
          bars={[
            { label: "GIR", value: 44, target: 38 },
            { label: "Fwy", value: 52, target: 61 },
          ]}
        />
      </Card>
    </div>
  );
}
