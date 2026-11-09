import { Card } from "@/brand/components/Card";
import { ToParPill } from "@/brand/components/ToParPill";

const scores = [-3, 0, 6, 13, null];

export default function ToParPillPreview() {
  return (
    <Card className="gap-3 px-4">
      {(["row", "sm", "md", "lg"] as const).map((size) => (
        <div key={size} className="flex items-center gap-2">
          {scores.map((toPar) => (
            <ToParPill key={String(toPar)} toPar={toPar} size={size} />
          ))}
        </div>
      ))}
      <div className="flex items-center gap-2">
        {scores.map((toPar) => (
          <ToParPill key={String(toPar)} toPar={toPar} ground="muted" />
        ))}
      </div>
    </Card>
  );
}
