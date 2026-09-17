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
  ScorecardTable,
} from "@/brand";
import { useTryItYourselfViewModel } from "../useTryItYourselfViewModel";

export function TryItYourselfSection() {
  const viewModel = useTryItYourselfViewModel();

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

            {!viewModel.file ? (
              <Dropzone
                title="Upload a scorecard photo"
                hint="Drag & drop or click to browse"
                onFile={viewModel.handleFile}
              />
            ) : (
              <div className="flex flex-col gap-4">
                <FileChip
                  name={viewModel.file.name}
                  sizeBytes={viewModel.file.size}
                  previewUrl={viewModel.preview}
                  onClear={viewModel.reset}
                />

                <ScorecardLayoutPicker onContextChange={viewModel.setUserContext} />

                {viewModel.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{viewModel.error}</AlertDescription>
                  </Alert>
                )}

                <Button size="lg" disabled={viewModel.extracting} onClick={viewModel.extract}>
                  <Upload data-icon="inline-start" />
                  Scan My Scorecard
                </Button>
              </div>
            )}

            {viewModel.error && !viewModel.file && (
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
            <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-primary px-4 py-3">
              <div>
                <div className="text-base font-bold text-primary-foreground">
                  {viewModel.courseName ?? "Unknown Course"}
                </div>
                {viewModel.courseLocation && (
                  <div className="text-xs text-primary-foreground/60">{viewModel.courseLocation}</div>
                )}
              </div>
              <div className="flex items-center gap-3">
                {viewModel.teeBox && (
                  <span className="text-sm font-medium text-primary-foreground/80">
                    {viewModel.teeBox} tees
                  </span>
                )}
                <Button variant="ghost" size="xs" onClick={viewModel.reset}>
                  <RotateCcw data-icon="inline-start" />
                  Scan another
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[43.75rem]">
                {viewModel.frontNine.length > 0 && (
                  <ScorecardTable holes={viewModel.frontNine} label="OUT" />
                )}

                {viewModel.backNine.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 border-y border-border bg-muted px-4 py-1.5">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                        Back Nine
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <ScorecardTable
                      holes={viewModel.backNine}
                      label="IN"
                      roundTotal={viewModel.roundTotal}
                    />
                  </>
                )}

                {!viewModel.hasScores && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No scores detected — try a clearer photo.
                  </p>
                )}
              </div>
            </div>

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
