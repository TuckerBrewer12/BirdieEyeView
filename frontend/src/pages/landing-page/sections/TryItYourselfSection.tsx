import { ArrowRight, RotateCcw, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Alert,
  AlertDescription,
  Button,
  Dropzone,
  FileChip,
  ScanProgress,
  ScorecardLayoutPicker,
  RoundScorecard,
} from "@/brand";
import { useFilePreview } from "../components/useFilePreview";
import type { TryItYourselfViewModel } from "../useTryItYourselfViewModel";

export function TryItYourselfSection({ viewModel }: { viewModel: TryItYourselfViewModel }) {
  const previewUrl = useFilePreview(viewModel.photo);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <AnimatePresence mode="wait">
        {viewModel.step === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="p-6"
          >
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-eyebrow text-primary">
              Try It Yourself
            </p>

            {!viewModel.photo ? (
              <Dropzone
                title="Upload a scorecard photo"
                hint="Drag & drop or click to browse"
                onFile={viewModel.pickPhoto}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <FileChip
                  name={viewModel.photo.name}
                  sizeBytes={viewModel.photo.size}
                  previewUrl={previewUrl}
                  onClear={viewModel.reset}
                />

                <ScorecardLayoutPicker onContextChange={viewModel.setUserContext} />

                {viewModel.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{viewModel.error}</AlertDescription>
                  </Alert>
                )}

                <Button size="lg" onClick={viewModel.extract}>
                  <Upload data-icon="inline-start" />
                  Scan My Scorecard
                </Button>
              </div>
            )}

            {viewModel.error && !viewModel.photo && (
              <Alert variant="destructive" className="mt-3">
                <AlertDescription>{viewModel.error}</AlertDescription>
              </Alert>
            )}
          </motion.div>
        )}

        {viewModel.step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <ScanProgress
              label={viewModel.phaseLabel}
              detail={viewModel.phaseDetail}
              phase={viewModel.phase}
              phaseCount={viewModel.phaseCount}
            />
          </motion.div>
        )}

        {viewModel.step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {viewModel.round && (
              <RoundScorecard
                round={viewModel.round}
                teeBox={viewModel.round.teeBox}
                className="rounded-none border-0 shadow-none"
                action={
                  <div className="flex items-center gap-3">
                    {viewModel.round.teeBox && (
                      <span className="text-sm font-medium text-primary-foreground/80">
                        {viewModel.round.teeBox} tees
                      </span>
                    )}
                    <Button variant="ghost" size="xs" onClick={viewModel.reset}>
                      <RotateCcw data-icon="inline-start" />
                      Scan another
                    </Button>
                  </div>
                }
              />
            )}

            {!viewModel.hasScores && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No scores detected — try a clearer photo.
              </p>
            )}

            <div className="border-t border-border px-6 py-5 text-center">
              <p className="mb-3 text-xs text-muted-foreground">
                Sign up to save this round and track your progress.
              </p>
              <Button render={<Link to="/register" />}>
                Sign up to save this round
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
