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
  RoundPreview,
  ScanProgress,
} from "@/brand";
import { tokens } from "@/brand/theme";
import { SCAN_STEPS } from "@/domain/scan";
import { useFilePreview } from "@/platform/useFilePreview";
import { SAMPLE_ROUND } from "../sampleRound";
import type { TryItYourselfViewModel } from "../useTryItYourselfViewModel";

/**
 * The hero: the headline, Try it with a photo and Sign up free, beside a photo of a card with the
 * round it reads back floated over it. Once a photo is picked, what's on the card and Scan my
 * scorecard take the photo's place; while it reads, the scan's progress does.
 */
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
            <img
              src="/hero/physical-card.jpg"
              alt="A paper scorecard held over a golf cart"
              className="block h-75 w-full rounded-2xl object-cover md:h-105 md:rounded-3xl"
            />
            {/* The round a scan of a card like this reads back, floated over the photo. Decoration. */}
            <Card
              aria-hidden
              data-slot="sample-round"
              className="absolute inset-x-3.5 bottom-3.5 md:inset-x-auto md:-bottom-6 md:-left-7 md:w-85"
            >
              <CardContent>
                <RoundPreview variant="summary" holes="strip" frame="none" round={SAMPLE_ROUND} />
              </CardContent>
            </Card>
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
