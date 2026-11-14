import { Camera, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardFactsForm,
  FileButton,
  FileChip,
  PageTitle,
  ScanProgress,
  ScanReport,
} from "@/brand";
import { tokens } from "@/brand/theme";
import { SCAN_STEPS } from "@/domain/scan";
import { useFilePreview } from "@/platform/useFilePreview";
import { ScannerDemo } from "../components/ScannerDemo";
import type { TryItYourselfViewModel } from "../useTryItYourselfViewModel";

export function HeroSection({ viewModel }: { viewModel: TryItYourselfViewModel }) {
  const previewUrl = useFilePreview(viewModel.photo);

  return (
    <section className="mx-auto grid max-w-276 items-center gap-10 px-5 pt-6 pb-16 md:px-6 md:pt-14 md:pb-18 lg:grid-cols-2 lg:gap-14">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={tokens.motion.entrance}
        className="flex flex-col gap-4 md:gap-5"
      >
        <PageTitle size="display">Scan your scorecard.</PageTitle>
        <p className="max-w-105 text-lg text-muted-foreground">
          Course, tees and every score, read from one photo.
        </p>
        <div className="mt-1 flex flex-col gap-3 md:mt-2 md:flex-row md:items-center">
          <FileButton size="lg" accept="image/*" onFile={viewModel.pickPhoto}>
            <Camera data-icon="inline-start" />
            Try it with a photo
          </FileButton>
          <Button variant="outline" size="lg" className="max-md:hidden" render={<Link to="/register" />}>
            Sign up free
          </Button>
          <p className="text-center text-sm text-muted-foreground md:hidden">
            or{" "}
            <Button variant="link" size="inline" className="font-semibold" render={<Link to="/register" />}>
              sign up free
            </Button>
          </p>
        </div>
        <p className="hidden text-body text-muted-foreground md:block">No account needed to try.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {viewModel.step === "processing" ? (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: tokens.motion.scanStep.processing }}
          >
            <Card className="py-0">
              <ScanProgress photoUrl={previewUrl} label={viewModel.phaseLabel} steps={SCAN_STEPS.length} phase={viewModel.phase} />
            </Card>
          </motion.div>
        ) : viewModel.photo ? (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: tokens.motion.scanStep.upload }}
          >
            <Card data-slot="try-it-setup">
              <CardContent className="flex flex-col gap-4">
                <FileChip
                  name={viewModel.photo.name}
                  sizeBytes={viewModel.photo.size}
                  previewUrl={previewUrl}
                  onClear={viewModel.reset}
                />
                <CardFactsForm card={viewModel.card} onChange={viewModel.setCard} idPrefix="try-it" />
                {viewModel.error && (
                  <Alert tone="danger">
                    <AlertDescription>{viewModel.error}</AlertDescription>
                  </Alert>
                )}
                {viewModel.report.available && (
                  <ScanReport
                    status={viewModel.report.status}
                    error={viewModel.report.error}
                    onReport={viewModel.report.submit}
                  />
                )}
                <Button size="lg" onClick={viewModel.extract}>
                  <Upload data-icon="inline-start" />
                  Scan my scorecard
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="photo"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ ...tokens.motion.entrance, delay: 0.1 }}
            className="relative mt-2 md:mt-0"
          >
            <ScannerDemo />
            {viewModel.error && (
              <Alert tone="danger" className="mt-4">
                <AlertDescription>{viewModel.error}</AlertDescription>
              </Alert>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
