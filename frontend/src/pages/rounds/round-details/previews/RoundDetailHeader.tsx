import {
  RoundDetailHeader,
  type HeaderHole,
} from "../components/RoundDetailHeader";

/** strokes-to-par per hole, turned into the {hole, strokes, par} the bars take. */
function nine(from: number, toPars: number[]): HeaderHole[] {
  return toPars.map((toPar, i) => ({
    hole: from + i,
    par: 4,
    strokes: 4 + toPar,
  }));
}

// One of every bucket, so each bar height and chip colour is exercised.
const front = nine(1, [0, 1, -1, 2, 0, 1, 3, 0, -2]);
const back = nine(10, [1, 0, 4, 1, 0, 2, 0, 1, 0]);

const counts = {
  eagle: 1, birdie: 1, par: 7, bogey: 5, double: 2, triple: 1, quad: 1,
} as const;

export default function RoundDetailHeaderPreview() {
  return (
    <>
      {/* Everything present: date, rated tee, net, both nines, stats, chips. */}
      <RoundDetailHeader
        courseName="Half Moon Bay"
        dateLabel="Mon · Jun 15 · 2026"
        tee={{ box: "blue", rating: "72.4 / 130" }}
        score={{ total: 78, toPar: 6, net: 66, courseHandicap: 12 }}
        nines={{
          front: { holes: front, total: 40 },
          back: { holes: back, total: 38 },
        }}
        stats={{ putts: 32, gir: 7 }}
        counts={counts}
      />

      {/* Level par, to check it reads green rather than red. */}
      <RoundDetailHeader
        courseName="Pebble Beach"
        dateLabel="Sat · Apr 4 · 2026"
        tee={{ box: "white" }}
        score={{ total: 72, toPar: 0 }}
        nines={{
          front: { holes: front, total: 36 },
          back: { holes: back, total: 36 },
        }}
        counts={{ par: 14, birdie: 2, bogey: 2 }}
      />

      {/* A scanned round: no tee, no net, no hole data, no stats, no chips. */}
      <RoundDetailHeader courseName="Scanned Scorecard" score={{ total: 85, toPar: null }} />

      {/* A part-played front nine — bars draw, but the total is withheld. */}
      <RoundDetailHeader
        courseName="Twilight Nine"
        dateLabel="Wed · Aug 12 · 2026"
        score={{ total: 41, toPar: 5 }}
        nines={{
          front: { holes: front.slice(0, 5), total: null },
          back: { holes: [], total: null },
        }}
        counts={{ par: 2, bogey: 2, double: 1 }}
      />
    </>
  );
}
