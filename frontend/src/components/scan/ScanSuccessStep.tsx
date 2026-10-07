import { Share2, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { RoundShareCard, toParLabel, toParTextClass } from "@/brand";
import { Round as RoundModel } from "@/domain";
import { useShareRound } from "@/hooks/useShareRound";
import { formatCourseName } from "@/lib/courseName";
import { roundShareMessage } from "@/lib/roundShareMessage";
import type { Round } from "@/types/golf";

interface ScanSuccessStepProps {
  round: Round;
  onView: () => void;
}

export function ScanSuccessStep({ round, onView }: ScanSuccessStepProps) {
  const played = RoundModel.fromDto(round);
  const courseName = formatCourseName(played.course?.name);
  const toParStr = toParLabel(played.toPar);
  const { cardRef, share, sharing } = useShareRound();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
      {/* Hidden share card for image capture */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-full">
        <RoundShareCard ref={cardRef} round={played} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center text-center max-w-sm w-full"
      >
        <CheckCircle2 className="text-primary mb-4" size={48} strokeWidth={1.5} />

        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900 mb-1">
          Round saved!
        </h2>
        <p className="text-sm text-gray-500 mb-2">{courseName}</p>
        <div className="flex items-baseline gap-2 mb-8">
          <span className="text-4xl font-black text-gray-900">{played.score ?? "—"}</span>
          {toParStr && (
            <span className={`text-xl font-bold ${toParTextClass(played.toPar)}`}>{toParStr}</span>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={() => share(roundShareMessage(played))}
            disabled={sharing}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors w-full"
          >
            <Share2 size={16} />
            {sharing ? "Preparing…" : "Share Round"}
          </button>
          <button
            onClick={onView}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors w-full"
          >
            View Round
            <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
