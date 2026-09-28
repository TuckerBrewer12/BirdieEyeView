import { HoleScore, Round, type RoundFacts } from "@/domain";
import { RoundDetailHeader } from "../components/RoundDetailHeader";

/** strokes-to-par per hole, as par-4 holes. */
function nine(from: number, toPars: number[]): HoleScore[] {
  return toPars.map((toPar, i) => new HoleScore({ hole: from + i, par: 4, strokes: 4 + toPar }));
}

function round(name: string, facts: Omit<RoundFacts, "id" | "course"> & { par?: number }): Round {
  return new Round({
    ...facts,
    id: name,
    course: { id: null, name, location: null, par: facts.par ?? null },
  });
}

// One of every bucket, so each bar height and chip colour is exercised.
const everyBucket = round("Half Moon Bay", {
  date: "2026-06-15T18:00:00.000Z",
  teeBox: "blue",
  par: 72,
  holes: [...nine(1, [0, 1, -1, 2, 0, 1, 3, 0, -2]), ...nine(10, [1, 0, 4, 1, 0, 2, 0, 1, 0])],
  totalPutts: 32,
  totalGir: 7,
});

const levelPar = round("Pebble Beach", {
  date: "2026-04-04T18:00:00.000Z",
  teeBox: "white",
  par: 72,
  holes: [...nine(1, [0, -1, 0, 1, 0, 0, 0, 0, 0]), ...nine(10, [0, 0, -1, 0, 0, 1, 0, 0, 0])],
});

// Strokes read off the card, but no par for any hole.
const scanned = round("Scanned Scorecard", {
  date: null,
  teeBox: null,
  holes: Array.from({ length: 18 }, (_, i) => new HoleScore({ hole: i + 1, par: null, strokes: i < 13 ? 5 : 4 })),
});

const partPlayed = round("Twilight Nine", {
  date: "2026-08-12T18:00:00.000Z",
  teeBox: null,
  holes: nine(1, [0, 1, -1, 2, 0]),
});

export default function RoundDetailHeaderPreview() {
  return (
    <>
      {/* Everything present: date, rated tee, net, both nines, stats, chips. */}
      <RoundDetailHeader round={everyBucket} teeRating="72.4 / 130" courseHandicap={12} />

      {/* Level par, to check it reads green rather than red. */}
      <RoundDetailHeader round={levelPar} />

      {/* A scanned card with no par: no tee, no net, no to-par, no chips. */}
      <RoundDetailHeader round={scanned} />

      {/* A part-played front nine — bars draw, but the total is withheld. */}
      <RoundDetailHeader round={partPlayed} />
    </>
  );
}
