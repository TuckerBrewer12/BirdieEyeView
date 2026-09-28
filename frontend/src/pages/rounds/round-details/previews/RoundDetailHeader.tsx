import { Round } from "@/domain";
import { roundResponse, type StoredHole } from "@/testing/fakes/roundResponses";
import { RoundDetailHeader } from "../components/RoundDetailHeader";

/** strokes-to-par per hole, as par-4 holes. */
function nine(from: number, toPars: number[], par: number | null = 4): StoredHole[] {
  return toPars.map((toPar, i) => ({
    hole_number: from + i,
    strokes: 4 + toPar,
    putts: null,
    fairway_hit: null,
    green_in_regulation: null,
    par_played: par,
  }));
}

/** A round as the server would send it, played on the named card with no linked course. */
function round(name: string, date: string | null, teeBox: string | null, holes: StoredHole[]): Round {
  return Round.fromDto(
    roundResponse({
      id: name,
      course: null,
      course_name_played: name,
      tee_box: teeBox,
      date,
      hole_scores: holes,
      notes: null,
      weather_conditions: null,
      user_tee: null,
    }),
  );
}

// One of every bucket, so each bar height and chip colour is exercised. 32 putts, 7 greens.
const everyBucket = round(
  "Half Moon Bay",
  "2026-06-15T18:00:00.000Z",
  "blue",
  [...nine(1, [0, 1, -1, 2, 0, 1, 3, 0, -2]), ...nine(10, [1, 0, 4, 1, 0, 2, 0, 1, 0])].map((hole, i) => ({
    ...hole,
    putts: i < 4 ? 1 : 2,
    green_in_regulation: i < 7,
  })),
);

const levelPar = round(
  "Pebble Beach",
  "2026-04-04T18:00:00.000Z",
  "white",
  [...nine(1, [0, -1, 0, 1, 0, 0, 0, 0, 0]), ...nine(10, [0, 0, -1, 0, 0, 1, 0, 0, 0])],
);

// Strokes read off the card, but no par for any hole.
const scanned = round("Scanned Scorecard", null, null, [
  ...nine(1, [1, 1, 1, 1, 1, 1, 1, 1, 1], null),
  ...nine(10, [1, 1, 1, 1, 0, 0, 0, 0, 0], null),
]);

const partPlayed = round("Twilight Nine", "2026-08-12T18:00:00.000Z", null, nine(1, [0, 1, -1, 2, 0]));

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
