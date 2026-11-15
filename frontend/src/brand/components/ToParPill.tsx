import { cn } from "@/brand/cn";
import { toParLabel, toParTextClass } from "@/brand/theme";

const SIZE = {
  row: "w-10 py-0.5 text-center text-body-sm",
  sm: "px-2 py-0.5 text-body-sm",
  md: "px-2.5 py-0.5 text-body",
  lg: "px-3 py-1 text-body-lg",
} as const;

const GROUND = {
  page: "bg-background",
  muted: "bg-muted",
} as const;

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
