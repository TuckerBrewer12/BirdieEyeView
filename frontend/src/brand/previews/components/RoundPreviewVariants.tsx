import { Collection } from "@/brand/components/Collection";
import { RoundPreview } from "@/brand/components/RoundPreview";
import { boardRounds } from "@/brand/previews/roundPreviewBoard";

const { overPar, evenPar, best, unlinked } = boardRounds;

/** The variants the boards don't draw, kept covered: tap to link, highlight, ticket, history. */
export default function RoundPreviewVariantsPreview() {
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="text-label text-muted-foreground">Unlinked, tap to link</div>
        <RoundPreview round={unlinked} onLinkClick={() => {}} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-label text-muted-foreground">Highlight</div>
        <RoundPreview round={best} variant="highlight" onClick={() => {}} />
        <RoundPreview round={null} variant="highlight" />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-label text-muted-foreground">Ticket</div>
        <RoundPreview round={overPar} variant="ticket" label="Last Round" actionLabel="Open card" onClick={() => {}} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-label text-muted-foreground">History</div>
        <Collection
          layout="divided"
          className="overflow-hidden rounded-xl border border-border bg-card"
          items={[overPar, evenPar, unlinked]}
          keyFor={(round) => round.id}
          renderItem={(round) => <RoundPreview variant="history" round={round} />}
        />
      </div>
    </>
  );
}
