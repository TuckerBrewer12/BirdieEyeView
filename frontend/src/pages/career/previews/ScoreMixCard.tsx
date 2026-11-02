import { sampleCareer } from "@/testing/fixtures/career";
import { ScoreMixCard } from "../components/ScoreMixCard";

export default function ScoreMixCardPreview() {
  return (
    <>
      <ScoreMixCard mix={sampleCareer.scoreMix} holesPlayed={sampleCareer.holesPlayed} />
      <ScoreMixCard mix={sampleCareer.scoreMix} holesPlayed={0} />
    </>
  );
}
