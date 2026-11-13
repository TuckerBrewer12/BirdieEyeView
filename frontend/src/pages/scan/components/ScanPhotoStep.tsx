import { Camera } from "lucide-react";
import {
  ActionBar,
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CourseLinkSearch,
  Dropzone,
  PhotoSourceSheet,
  type PhotoSource,
} from "@/brand";
import { formatCourseName } from "@/domain/course";
import { formatFileSize } from "@/domain";
import type { ScanPageViewModel } from "../useScanPageViewModel";
import { ScanCardForm } from "./ScanCardForm";

type PhotoStep = Pick<
  ScanPageViewModel,
  | "photo"
  | "pickPhoto"
  | "clearPhoto"
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

function readLabel(step: PhotoStep) {
  return step.error ? "Read card again" : "Read card";
}

function ScanFailed({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <Alert tone="danger" data-slot="scan-failed">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}

/**
 * A computer's scan: a drop zone with the course beside it, then once a photo is picked, the photo
 * beside what's on the card, and the button that reads it.
 */
export function ScanPhotoStepWide({ step, previewUrl }: ScanPhotoStepProps) {
  const { photo, courseSearch } = step;

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
            <p className="text-body text-muted-foreground">
              Optional: pick the course and the card is read against it.
            </p>
            <CourseLinkSearch
              surface="plain"
              query={courseSearch.query}
              results={courseSearch.results}
              searching={courseSearch.searching}
              onQueryChange={courseSearch.setQuery}
              onSelectCourse={step.pickPresetCourse}
              onClose={courseSearch.reset}
              linkedName={step.presetCourse ? formatCourseName(step.presetCourse.name) : undefined}
              linkedTitle="Read against this course"
              onClear={step.clearPresetCourse}
              clearLabel="Clear course"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <ScanFailed error={step.error} />
      <Card data-slot="scan-upload">
        <CardContent className="grid grid-cols-scan-photo gap-6">
          <div data-slot="scan-photo" className="flex flex-col gap-2.5">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Your scorecard"
                className="aspect-4/3 w-card-photo rounded-photo bg-muted object-cover"
              />
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-body-sm text-muted-foreground">
                {photo.name} · {formatFileSize(photo.size)}
              </span>
              <Button variant="link" size="inline" onClick={step.clearPhoto}>
                Replace
              </Button>
            </div>
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
 * file, which shows above the form with the button that reads it.
 */
export function ScanPhotoStepPhone({
  step,
  previewUrl,
  pickNative,
}: ScanPhotoStepProps & { pickNative?: (source: PhotoSource) => Promise<File | null> }) {
  const { photo } = step;
  return (
    <>
      <ScanFailed error={step.error} />
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
            <PhotoSourceSheet
              title="Retake scorecard photo"
              trigger={<Button variant="ghost" />}
              onFile={step.pickPhoto}
              pickNative={pickNative}
              accept={ACCEPT}
            >
              Retake
            </PhotoSourceSheet>
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
