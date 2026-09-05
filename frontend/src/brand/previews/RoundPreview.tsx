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
    </>
  );
}
