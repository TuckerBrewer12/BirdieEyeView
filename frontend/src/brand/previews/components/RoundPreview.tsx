import { RoundPreview } from "@/brand/components/RoundPreview";
import { boardRounds } from "@/brand/previews/roundPreviewBoard";

/** Board A, "refined row": the dated rows at the board's size. */
export default function RoundPreviewPreview() {
  return (
    <div data-testid="brand-frame" className="fixed inset-0 flex flex-col gap-2.5 bg-background p-6">
      <RoundPreview round={boardRounds.overPar} onClick={() => {}} />
      <RoundPreview round={boardRounds.evenPar} onClick={() => {}} />
      <RoundPreview round={boardRounds.unlinked} onClick={() => {}} />
    </div>
  );
}
