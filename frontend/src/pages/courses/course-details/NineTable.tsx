import { cn } from "@/brand/cn";
import type { ScorecardNine } from "./useCourseDetailPageViewModel";

export function NineTable({ nine }: { nine: ScorecardNine }) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="bg-muted text-xs font-medium uppercase text-muted-foreground">
          <th className="w-24 px-3 py-2 text-left">Hole</th>
          {nine.holes.map((cell) => (
            <th key={cell.hole} className="w-10 px-2 py-2 text-center">{cell.hole}</th>
          ))}
          <th className="w-12 bg-muted px-2 py-2 text-center">{nine.label}</th>
          {nine.showTotal && <th className="w-14 bg-muted px-2 py-2 text-center">TOT</th>}
        </tr>
      </thead>
      <tbody>
        {nine.showYards && (
          <tr className="border-b border-border text-xs text-muted-foreground">
            <td className="px-3 py-1.5 font-medium">
              <span className={cn("inline-block rounded px-2 py-0.5 text-xs font-semibold", nine.teeSwatchClass, nine.teeSwatchTextClass)}>
                {nine.teeLabel ?? "?"}
              </span>
            </td>
            {nine.holes.map((cell) => (
              <td key={cell.hole} className="px-2 py-1.5 text-center">{cell.yards}</td>
            ))}
            <td className="bg-muted px-2 py-1.5 text-center font-semibold">{nine.nineYards}</td>
            {nine.showTotal && (
              <td className="bg-muted px-2 py-1.5 text-center font-semibold">{nine.totalYards}</td>
            )}
          </tr>
        )}

        <tr className="border-b border-border font-semibold text-foreground">
          <td className="px-3 py-2">Par</td>
          {nine.holes.map((cell) => (
            <td key={cell.hole} className="px-2 py-2 text-center">{cell.par}</td>
          ))}
          <td className="bg-muted px-2 py-2 text-center font-bold">{nine.ninePar}</td>
          {nine.showTotal && (
            <td className="bg-muted px-2 py-2 text-center font-bold">{nine.totalPar}</td>
          )}
        </tr>

        <tr className="border-b border-border text-xs text-muted-foreground">
          <td className="px-3 py-1.5 font-medium">Hdcp</td>
          {nine.holes.map((cell) => (
            <td key={cell.hole} className="px-2 py-1.5 text-center">{cell.handicap}</td>
          ))}
          <td className="bg-muted px-2 py-1.5" />
          {nine.showTotal && <td className="bg-muted px-2 py-1.5" />}
        </tr>

        {nine.showPersonalAvg && (
          <tr className="border-b border-border text-xs font-semibold text-primary">
            <td className="px-3 py-1.5 font-medium">My Avg</td>
            {nine.holes.map((cell) => (
              <td key={cell.hole} className="px-2 py-1.5 text-center">{cell.personalAvg ?? "—"}</td>
            ))}
            <td className="bg-muted px-2 py-1.5 text-center font-bold">{nine.ninePersonalAvg}</td>
            {nine.showTotal && (
              <td className="bg-muted px-2 py-1.5 text-center font-bold">{nine.totalPersonalAvg}</td>
            )}
          </tr>
        )}
      </tbody>
    </table>
  );
}
