import { Collection } from "@/brand/components/Collection";
import { RoundPreview } from "@/brand/components/RoundPreview";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, evenPar, , unlinked] = populatedRounds;

/** Compose-style @Preview for RoundPreview. */
export default function RoundPreviewPreview() {
  return (
    <>
      <RoundPreview round={overPar} />
      <RoundPreview round={evenPar} />
      <RoundPreview round={unlinked} onLinkClick={() => {}} />
      <Collection
        layout="divided"
        className="overflow-hidden rounded-xl border border-border bg-card"
        items={[overPar, evenPar, unlinked]}
        keyFor={(round) => round.id}
        renderItem={(round) => <RoundPreview variant="history" round={round} />}
      />
    </>
  );
}
