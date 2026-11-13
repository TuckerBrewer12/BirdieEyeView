import { cn } from "@/brand/cn";
import { toParLabel, toParTextClass } from "@/brand/theme";

const SIZE = {
  /** A row's pill, a fixed width so a list's pills line up. */
  row: "w-10 py-0.5 text-center text-body-sm",
  sm: "px-2 py-0.5 text-body-sm",
  md: "px-2.5 py-0.5 text-body",
  lg: "px-3 py-1 text-body-lg",
} as const;

const GROUND = {
  /** The page's colour, set into a card. */
  page: "bg-background",
  muted: "bg-muted",
} as const;

/**
 * A score's to-par in a pill, coloured by how it went: "+6", "E", "-3". With no to-par it shows a
 * dash, so a list's pills keep their place.
 */
function ToParPill({
  toPar,
  size = "sm",
  ground = "page",
  className,
}: {
  toPar: number | null;
  size?: keyof typeof SIZE;
  ground?: keyof typeof GROUND;
  className?: string;
}) {
  return (
    <span
      data-slot="to-par-pill"
      className={cn("shrink-0 rounded-full font-semibold", SIZE[size], GROUND[ground], toParTextClass(toPar), className)}
    >
      {toParLabel(toPar) ?? "—"}
    </span>
  );
}

export { ToParPill };
