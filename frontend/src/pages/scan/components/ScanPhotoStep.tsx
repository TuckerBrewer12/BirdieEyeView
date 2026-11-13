import type { ReactNode } from "react";
import { ArrowRight, Camera } from "lucide-react";
import {
  ActionBar,
  Alert,
  AlertAction,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Dropzone,
  FileButton,
  PhotoSourceSheet,
  type PhotoSource,
} from "@/brand";
import { formatFileSize } from "@/domain";
import type { ScanPageViewModel } from "../useScanPageViewModel";
import { ScanCardForm } from "./ScanCardForm";
import { PresetCourseField } from "./PresetCourseField";

type PhotoStep = Pick<
  ScanPageViewModel,
  | "photo"
  | "pickPhoto"
  | "extract"
  | "error"
  | "card"
  | "setCard"
  | "courseSearch"
  | "presetCourse"
  | "pickPresetCourse"
  | "clearPresetCourse"
>;

interface ScanPhotoStepProps {
  step: PhotoStep;
  /** The picked photo, as an image. */
  previewUrl: string | null;
}

const ACCEPT = "image/*,application/pdf";
const ANOTHER_PHOTO = "Try another photo";

function readLabel(step: PhotoStep) {
  return step.error ? "Read card again" : "Read card";
}

/** Why the read failed, with the way to another photo at its end. */
function ScanFailed({ error, action }: { error: string | null; action: ReactNode }) {
  if (!error) return null;
  return (
    <Alert tone="danger" data-slot="scan-failed">
      <AlertDescription>{error}</AlertDescription>
      <AlertAction>{action}</AlertAction>
    </Alert>
  );
}

/**
 * A computer's scan: a drop zone with the course under it, then once a photo is picked, the photo
 * beside what's on the card, and the button that reads it. Another photo comes from the button
 * under the photo, or from the failed read's banner.
 */
export function ScanPhotoStepWide({ step, previewUrl }: ScanPhotoStepProps) {
  const { photo } = step;

  if (!photo) {
    return (
      <Card data-slot="scan-upload">
        <CardContent className="flex flex-col gap-4">
          <Dropzone
            title="Drop a photo of your card"
            hint="JPG, PNG, HEIC or PDF"
            actionLabel="Choose photo"
            accept={ACCEPT}
            onFile={step.pickPhoto}
            className="min-h-dropzone"
          />
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <p className="text-body text-muted-foreground">Optional: pick the course.</p>
            <PresetCourseField course={step} />
          </div>
        </CardContent>
      </Card>
    );
  }

  const anotherPhoto = (variant: "outline" | "secondary") => (
    <FileButton variant={variant} accept={ACCEPT} onFile={step.pickPhoto}>
      {ANOTHER_PHOTO}
      <ArrowRight data-icon="inline-end" />
    </FileButton>
  );

  return (
    <>
      <ScanFailed error={step.error} action={anotherPhoto("outline")} />
      <Card data-slot="scan-upload">
        <CardContent className="grid grid-cols-scan-photo gap-6">
          <div data-slot="scan-photo" className="flex flex-col gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Your scorecard"
                className="aspect-4/3 w-card-photo rounded-photo bg-muted object-cover"
              />
            )}
            <span className="min-w-0 truncate text-body-sm text-muted-foreground">
              {photo.name} · {formatFileSize(photo.size)}
            </span>
            {!step.error && anotherPhoto("secondary")}
          </div>
          <div className="flex flex-col gap-5">
            <ScanCardForm form={step} />
            <Button size="lg" onClick={step.extract}>
              {readLabel(step)}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

/**
 * A phone's scan: what's on the card first, then the photo from the camera, the library or a
 * file, which shows above the form with the button that reads it. Retake opens the same sheet,
 * from the photo's row or the failed read's banner.
 */
export function ScanPhotoStepPhone({
  step,
  previewUrl,
  pickNative,
}: ScanPhotoStepProps & { pickNative?: (source: PhotoSource) => Promise<File | null> }) {
  const { photo } = step;
  const retake = (variant: "outline" | "secondary", label: ReactNode) => (
    <PhotoSourceSheet
      title="Retake scorecard photo"
      trigger={<Button variant={variant} />}
      onFile={step.pickPhoto}
      pickNative={pickNative}
      accept={ACCEPT}
    >
      {label}
    </PhotoSourceSheet>
  );

  return (
    <>
      <ScanFailed
        error={step.error}
        action={retake(
          "outline",
          <>
            {ANOTHER_PHOTO}
            <ArrowRight data-icon="inline-end" />
          </>,
        )}
      />
      {photo && (
        <Card size="sm" data-slot="scan-photo">
          <CardContent className="flex items-center gap-3">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Your scorecard"
                className="aspect-4/3 w-photo-thumb shrink-0 rounded-lg bg-muted object-cover"
              />
            )}
            <span className="min-w-0 flex-1 truncate text-body font-semibold text-foreground">{photo.name}</span>
            {!step.error && retake("secondary", "Retake")}
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent>
          <ScanCardForm form={step} />
        </CardContent>
      </Card>
      <ActionBar>
        {photo ? (
          <Button size="lg" className="flex-1" onClick={step.extract}>
            {readLabel(step)}
          </Button>
        ) : (
          <PhotoSourceSheet
            title="Add scorecard photo"
            trigger={<Button size="lg" className="flex-1" />}
            onFile={step.pickPhoto}
            pickNative={pickNative}
            accept={ACCEPT}
          >
            <Camera data-icon="inline-start" />
            Add scorecard photo
          </PhotoSourceSheet>
        )}
      </ActionBar>
    </>
  );
}
