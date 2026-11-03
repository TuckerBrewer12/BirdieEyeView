import { cn } from "@/brand/cn";
import { RoundPreview } from "@/brand/components/RoundPreview";
import { boardRounds } from "@/brand/previews/roundPreviewBoard";
import { scoreFillClass, scoreKindLabel } from "@/brand/theme";

const legend = ["eagle", "birdie", "bogey", "double", "triple", "quad"] as const;

/** Board B, "scorecard strip": every hole as played, with the board's legend under the rows. */
export default function RoundPreviewStripPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-2.5 bg-background p-6">
      <RoundPreview variant="strip" round={boardRounds.overPar} onClick={() => {}} />
      <RoundPreview variant="strip" round={boardRounds.best} onClick={() => {}} />
      <RoundPreview variant="strip" round={boardRounds.unlinked} onClick={() => {}} />
      <div className="flex gap-3.5 px-1 py-0.5 text-label text-muted-foreground">
        {legend.map((kind) => (
          <span key={kind} className="flex items-center gap-1.25">
            <span
              className={cn(
                "size-2.5",
                scoreFillClass(kind),
                kind === "eagle" || kind === "birdie" ? "rounded-full" : "rounded-tick",
              )}
            />
            {scoreKindLabel(kind)}
          </span>
        ))}
      </div>
    </div>
  );
}
