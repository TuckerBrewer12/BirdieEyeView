import { TeeSwatch } from "@/brand";
import type { ScorecardNine } from "../courseDetailModel";

const dash = (value: number | null) => (value == null ? "—" : String(value));
const average = (value: number | null) => (value == null ? "—" : value.toFixed(1));

export function NineTable({ nine }: { nine: ScorecardNine }) {
  const { tee, totals } = nine;
  const showAverages = nine.personalAverage != null;

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted text-xs font-medium uppercase text-muted-foreground">
          <th className="w-24 px-3 py-2 text-left">Hole</th>
          {nine.holes.map((cell) => (
            <th key={cell.hole} className="w-10 px-2 py-2 text-center">{cell.hole}</th>
          ))}
          <th className="w-12 bg-muted px-2 py-2 text-center">{nine.side === "front" ? "OUT" : "IN"}</th>
          {totals && <th className="w-14 bg-muted px-2 py-2 text-center">TOT</th>}
        </tr>
      </thead>
      <tbody>
        {tee && (
          <tr className="border-b border-border text-xs text-muted-foreground">
            <td className="px-3 py-1.5 font-medium">
              <TeeSwatch color={tee.color} className="rounded px-2 py-0.5 text-body-sm font-semibold">
                {tee.color ?? "?"}
              </TeeSwatch>
            </td>
            {nine.holes.map((cell) => (
              <td key={cell.hole} className="px-2 py-1.5 text-center">{dash(cell.yards)}</td>
            ))}
            <td className="bg-muted px-2 py-1.5 text-center font-semibold">{dash(nine.yards)}</td>
            {totals && (
              <td className="bg-muted px-2 py-1.5 text-center font-semibold">{dash(totals.yards)}</td>
            )}
          </tr>
        )}

        <tr className="border-b border-border font-semibold text-foreground">
          <td className="px-3 py-2">Par</td>
          {nine.holes.map((cell) => (
            <td key={cell.hole} className="px-2 py-2 text-center">{dash(cell.par)}</td>
          ))}
          <td className="bg-muted px-2 py-2 text-center font-bold">{dash(nine.par)}</td>
          {totals && (
            <td className="bg-muted px-2 py-2 text-center font-bold">{dash(totals.par)}</td>
          )}
        </tr>

        <tr className="border-b border-border text-xs text-muted-foreground">
          <td className="px-3 py-1.5 font-medium">Hdcp</td>
          {nine.holes.map((cell) => (
            <td key={cell.hole} className="px-2 py-1.5 text-center">{dash(cell.handicap)}</td>
          ))}
          <td className="bg-muted px-2 py-1.5" />
          {totals && <td className="bg-muted px-2 py-1.5" />}
        </tr>

        {showAverages && (
          <tr className="border-b border-border text-xs font-semibold text-primary">
            <td className="px-3 py-1.5 font-medium">My Avg</td>
            {nine.holes.map((cell) => (
              <td key={cell.hole} className="px-2 py-1.5 text-center">{average(cell.personalAverage)}</td>
            ))}
            <td className="bg-muted px-2 py-1.5 text-center font-bold">{average(nine.personalAverage)}</td>
            {totals && (
              <td className="bg-muted px-2 py-1.5 text-center font-bold">{average(totals.personalAverage)}</td>
            )}
          </tr>
        )}
      </tbody>
    </table>
  );
}
