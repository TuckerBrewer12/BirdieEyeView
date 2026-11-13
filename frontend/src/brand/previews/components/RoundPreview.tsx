import { Card } from "@/brand/components/Card";
import { Collection } from "@/brand/components/Collection";
import { RoundPreview } from "@/brand/components/RoundPreview";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, evenPar, best, unlinked] = populatedRounds.map(Round.fromSummary);

/** Compose-style @Preview for RoundPreview. */
export default function RoundPreviewPreview() {
  return (
    <>
      <RoundPreview round={best} variant="highlight" onClick={() => {}} />
      <RoundPreview round={evenPar} variant="highlight" onClick={() => {}} />
      <RoundPreview round={overPar} variant="highlight" onClick={() => {}} />
      <RoundPreview round={null} variant="highlight" />
      {/* The Rounds page's rows, divided in one card; the unlinked round offers Link. */}
      <Card className="gap-0 py-0">
        <Collection
          layout="divided"
          items={[overPar, evenPar, unlinked]}
          keyFor={(round) => round.id}
          renderItem={(round) => <RoundPreview round={round} onClick={() => {}} onLinkClick={() => {}} />}
        />
      </Card>
      <Collection
        layout="divided"
        className="overflow-hidden rounded-xl border border-border bg-card"
        items={[overPar, evenPar, unlinked]}
        keyFor={(round) => round.id}
        renderItem={(round) => <RoundPreview variant="history" round={round} />}
      />
      <Card className="gap-0 py-0">
        <Collection
          layout="divided"
          items={[overPar, evenPar, best, unlinked]}
          keyFor={(round) => round.id}
          renderItem={(round) => <RoundPreview variant="compact" round={round} onClick={() => {}} />}
        />
      </Card>
      <Card className="w-preview gap-0 py-0">
        <Collection
          layout="divided"
          items={[overPar, evenPar, best]}
          keyFor={(round) => round.id}
          renderItem={(round) => <RoundPreview variant="compact" layout="stacked" round={round} onClick={() => {}} />}
        />
      </Card>
    </>
  );
}
