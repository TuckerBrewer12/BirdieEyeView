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
import { useFilePreview } from "@/platform/useFilePreview";
import { SCAN_READING_LABEL, SCAN_STEPS } from "@/domain/scan";
import { tokens } from "@/brand/theme";
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
            transition={{ duration: tokens.motion.scanStep.upload }}
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
                  <Alert tone="danger">
                    <AlertDescription>{viewModel.error}</AlertDescription>
                  </Alert>
                )}

                <Button size="lg" onClick={viewModel.extract}>
                  <Upload data-icon="inline-start" />
                  Scan my scorecard
                </Button>
              </div>
            )}

            {viewModel.error && !viewModel.photo && (
              <Alert tone="danger" className="mt-3">
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
            transition={{ duration: tokens.motion.scanStep.processing }}
          >
            <ScanProgress
              label={SCAN_READING_LABEL}
              steps={SCAN_STEPS}
              phase={viewModel.phase}
              className="mx-auto max-w-sm"
            />
          </motion.div>
        )}

        {viewModel.step === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: tokens.motion.scanStep.review }}
          >
            {viewModel.round && (
              <RoundScorecard
                round={viewModel.round}
                teeBox={viewModel.round.teeBox}
                showTee
                className="rounded-none border-0 shadow-none"
                action={
                  <Button variant="secondary" size="xs" onClick={viewModel.reset}>
                    <RotateCcw data-icon="inline-start" />
                    Scan another
                  </Button>
                }
              />
            )}

            {!viewModel.hasScores && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No scores detected — try a clearer photo.
              </p>
            )}

            <div className="border-t border-border px-6 py-5 text-center">
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
