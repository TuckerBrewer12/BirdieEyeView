import { ScoreKindLabel } from "@/brand/components/ScoreKindLabel";
import { SCORE_KEYS } from "@/brand/theme";

export default function ScoreKindLabelPreview() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3 text-label font-medium">
        {SCORE_KEYS.map((kind) => (
          <ScoreKindLabel key={kind} kind={kind}>
            {kind}
          </ScoreKindLabel>
        ))}
      </div>
      <div className="flex flex-wrap gap-3 text-body-sm text-foreground-secondary">
        {SCORE_KEYS.map((kind) => (
          <ScoreKindLabel key={kind} kind={kind} swatch="fill" ink="inherit" className="gap-1">
            {kind}
          </ScoreKindLabel>
        ))}
      </div>
    </div>
  );
}
