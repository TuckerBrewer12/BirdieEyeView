import { motion } from "framer-motion";
import { cn } from "@/brand/cn";
import { tokens } from "@/brand/theme";

interface ScanProgressProps {
  photoUrl: string | null;
  label: string;
  steps: number;
  phase: number;
  className?: string;
}

const { lineFrom, lineTo } = tokens.scan;

function ScanProgress({ photoUrl, label, steps, phase, className }: ScanProgressProps) {
  const at = steps > 1 ? lineFrom + ((lineTo - lineFrom) * phase) / (steps - 1) : lineFrom;
  const line = `${at}%`;
  return (
    <div
      data-slot="scan-progress"
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center gap-5", className)}
    >
      <div className="relative aspect-3/2 w-full max-w-scan-photo overflow-hidden rounded-photo bg-muted shadow-photo">
        {photoUrl && <img src={photoUrl} alt="Your scorecard" className="block size-full object-cover" />}
        <motion.div
          aria-hidden
          className="absolute inset-x-0 top-0 bg-scan-shade"
          initial={false}
          animate={{ height: line }}
          transition={{ duration: tokens.motion.scanLine, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden
          className="absolute inset-x-0 h-1 bg-scan-line shadow-scan-line"
          initial={false}
          animate={{ top: line }}
          transition={{ duration: tokens.motion.scanLine, ease: "easeInOut" }}
        />
      </div>
      <p className="text-body-lg font-semibold text-foreground">{label}</p>
      <div aria-hidden className="flex gap-1.5">
        {Array.from({ length: steps }, (_, i) => (
          <span key={i} className={cn("h-1 w-9 rounded-xs md:w-10", i <= phase ? "bg-primary" : "bg-border-strong")} />
        ))}
      </div>
    </div>
  );
}

export { ScanProgress };
export type { ScanProgressProps };
