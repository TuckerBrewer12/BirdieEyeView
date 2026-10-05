import { ScoreCountChip } from "@/brand/components/ScoreCountChip";

export default function ScoreCountChipPreview() {
  return (
    <div className="flex flex-wrap gap-1.5">
      <ScoreCountChip kind="eagle" count={1}>Eagle</ScoreCountChip>
      <ScoreCountChip kind="birdie" count={3}>Birdies</ScoreCountChip>
      <ScoreCountChip kind="par" count={9}>Pars</ScoreCountChip>
      <ScoreCountChip kind="bogey" count={4}>Bogeys</ScoreCountChip>
      <ScoreCountChip kind="double" count={1}>Double</ScoreCountChip>
      <ScoreCountChip kind="triple" count={2}>Triples+</ScoreCountChip>
      <ScoreCountChip kind="quad" count={1}>Quad</ScoreCountChip>
    </div>
  );
}
