import type { ReactNode } from "react";
import { ArrowRight, Camera, CircleAlert } from "lucide-react";
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
  ScanReport,
  type PhotoSource,
} from "@/brand";
import { formatFileSize } from "@/domain";
import { scanFailure } from "../present";
import type { ScanPageViewModel } from "../useScanPageViewModel";
import { ScanCardForm } from "./ScanCardForm";
import { PresetCourseField } from "./PresetCourseField";

type PhotoStep = Pick<
  ScanPageViewModel,
  | "photo"
  | "pickPhoto"
  | "extract"
  | "error"
  | "report"
  | "card"
  | "setCard"
  | "courseSearch"
  | "presetCourse"
  | "pickPresetCourse"
  | "clearPresetCourse"
>;

interface ScanPhotoStepProps {
  step: PhotoStep;
  previewUrl: string | null;
}

const ACCEPT = "image/*,application/pdf";
const ANOTHER_PHOTO = "Try another photo";

const READ_CARD = "Read card";

function ScanFailed({ step, action }: { step: PhotoStep; action: ReactNode }) {
  if (!step.error) return null;
  const { title, detail } = scanFailure(step.error);
  const { report } = step;
  return (
    <Alert tone="danger" data-slot="scan-failed" className="px-4 py-3.5 text-body-lg">
      <CircleAlert className="size-5" />
      <AlertDescription>
        <strong className="block font-semibold md:inline">{title}</strong> {detail}
        {report.available && (
          <>
            {" "}
            <ScanReport status={report.status} error={report.error} onSend={report.submit} />
          </>
        )}
      </AlertDescription>
      <AlertAction>{action}</AlertAction>
    </Alert>
  );
}

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
      <ScanFailed step={step} action={anotherPhoto("outline")} />
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
              {READ_CARD}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function ScanPhotoStepPhone({
  step,
  previewUrl,
  pickNative,
}: ScanPhotoStepProps & { pickNative?: (source: PhotoSource) => Promise<File | null> }) {
  const { photo } = step;

  return (
    <>
      <ScanFailed
        step={step}
        action={
          <PhotoSourceSheet
            title="Retake scorecard photo"
            trigger={<Button variant="link" size="inline" className="font-semibold text-current underline" />}
            onFile={step.pickPhoto}
            pickNative={pickNative}
            accept={ACCEPT}
          >
            {ANOTHER_PHOTO}
          </PhotoSourceSheet>
        }
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
            {!step.error && (
              <PhotoSourceSheet
                title="Retake scorecard photo"
                trigger={<Button variant="secondary" />}
                onFile={step.pickPhoto}
                pickNative={pickNative}
                accept={ACCEPT}
              >
                Retake
              </PhotoSourceSheet>
            )}
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
            {READ_CARD}
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
