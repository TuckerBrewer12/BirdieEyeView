import { Collection } from "@/brand/components/Collection";
import { RoundPreview } from "@/brand/components/RoundPreview";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, evenPar, best, fixtureUnlinked] = populatedRounds.map(Round.fromSummary);

/** The board's Mar 9 card: a double on the first hole, then bogeys and pars, as the redesign shows it. */
const UNLINKED_KINDS = [
  "double", "bogey", "bogey", "bogey", "bogey", "par", "bogey", "par", "par",
  "bogey", "bogey", "bogey", "bogey", "par", "bogey", "par", "bogey", "par",
] as const;
const unlinked = {
  ...fixtureUnlinked,
  holes: fixtureUnlinked.holes.map((hole, i) => ({ ...hole, kind: UNLINKED_KINDS[i] ?? hole.kind })),
};

/** Compose-style @Preview for RoundPreview. */
export default function RoundPreviewPreview() {
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <RoundPreview round={overPar} onClick={() => {}} />
        <RoundPreview round={evenPar} onClick={() => {}} />
        <RoundPreview round={unlinked} onClick={() => {}} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-label text-muted-foreground">Unlinked, tap to link</div>
        <RoundPreview round={unlinked} onLinkClick={() => {}} />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-label text-muted-foreground">Highlight</div>
        <RoundPreview round={best} variant="highlight" onClick={() => {}} />
        <RoundPreview round={evenPar} variant="highlight" onClick={() => {}} />
        <RoundPreview round={overPar} variant="highlight" onClick={() => {}} />
        <RoundPreview round={null} variant="highlight" />
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="text-label text-muted-foreground">Ticket</div>
        <RoundPreview round={overPar} variant="ticket" label="Last Round" actionLabel="Open card" onClick={() => {}} />
        <RoundPreview round={best} variant="ticket" label="Best This Year" />
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
