import { motion } from "framer-motion";
import { cn } from "@/brand/cn";

interface ScanProgressProps {
  label: string;
  detail: string;
  /** Which phase is running, and how many there are, for the step rail. */
  phase: number;
  phaseCount: number;
  className?: string;
}

const CORNERS = ["tl", "tr", "bl", "br"] as const;
const ROWS = ["bg-muted-foreground/40", "bg-primary/25", "bg-muted-foreground/40", "bg-muted-foreground/25"];

/**
 * The card-being-read animation shown while a scan is in flight.
 *
 * Pure: which phase is running is the caller's business, so the same animation
 * serves the landing page's demo and the signed-in scan flow without either
 * owning a timer the other cannot see.
 */
function ScanProgress({ label, detail, phase, phaseCount, className }: ScanProgressProps) {
  return (
    <div
      data-slot="scan-progress"
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center py-10", className)}
    >
      <div className="relative mb-10">
        <motion.div
          className="relative h-36 w-56 overflow-hidden rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-card to-accent"
          animate={{ opacity: [0.92, 1, 0.92] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="pointer-events-none absolute inset-0 flex select-none flex-col gap-2 p-3 pt-4">
            {ROWS.map((tone, row) => (
              <div key={row} className="flex items-center gap-1">
                <div className={cn("h-1.5 w-8 rounded-full", tone)} />
                {Array.from({ length: 9 }).map((_, cell) => (
                  <div key={cell} className={cn("h-1.5 w-3.5 shrink-0 rounded-full", tone)} />
                ))}
              </div>
            ))}
          </div>

          <motion.div
            className="pointer-events-none absolute right-0 left-0 h-px bg-primary shadow-card"
            animate={{ top: ["8%", "92%"] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
          <motion.div
            className="pointer-events-none absolute right-0 left-0 h-10 bg-gradient-to-b from-primary/10 to-transparent"
            animate={{ top: ["-10%", "70%"] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
          />
        </motion.div>

        {CORNERS.map((corner, i) => (
          <motion.div
            key={corner}
            className={cn(
              "absolute size-4 border-primary",
              corner.startsWith("t") ? "-top-2 border-t-2" : "-bottom-2 border-b-2",
              corner.endsWith("l") ? "-left-2 border-l-2" : "-right-2 border-r-2",
            )}
            animate={{ opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.45, ease: "easeInOut" }}
          />
        ))}
      </div>

      <div className="px-4 text-center">
        <p className="mb-1 text-base font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {Array.from({ length: phaseCount }).map((_, i) => (
          <motion.div
            key={i}
            className="h-1.5 rounded-full bg-primary"
            animate={{
              width: i < phase ? 18 : i === phase ? 32 : 6,
              opacity: i <= phase ? 1 : 0.18,
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        ))}
      </div>
    </div>
  );
}

export { ScanProgress };
