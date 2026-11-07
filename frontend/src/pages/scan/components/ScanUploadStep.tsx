import { Camera, CircleAlert, Images, PenLine, RotateCw, ScanLine } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Dropzone,
  FileChip,
  ScorecardLayoutPicker,
} from "@/brand";
import { isNative, pickImageNative } from "@/platform/nativeCamera";
import type { ScanFailureNotice } from "../present";

export interface ScanUploadPhoto {
  name: string;
  sizeBytes: number;
  previewUrl: string | null;
}

interface ScanUploadStepProps {
  /** The picked photo, or null before one is picked. */
  photo: ScanUploadPhoto | null;
  onPick: (photo: File) => void;
  onClear: () => void;
  onContextChange: (context: string) => void;
  onExtract: () => void;
  /**
   * Why the last scan of this photo failed. It shows beside the photo, and the button reads the
   * card again rather than starting fresh.
   */
  failure?: ScanFailureNotice | null;
  /** Offered with a failure: give up on the photo and type the scores in. */
  onEnterByHand?: () => void;
  /** On a phone app, the camera and photo library stand in for the drop zone. */
  native?: boolean;
}

/** Picking the card's photo, saying what's on it, and starting the scan. */
export function ScanUploadStep({
  photo,
  onPick,
  onClear,
  onContextChange,
  onExtract,
  failure = null,
  onEnterByHand,
  native = isNative,
}: ScanUploadStepProps) {
  if (!photo) {
    return native ? (
      <NativePicker onPick={onPick} />
    ) : (
      <Dropzone
        title="Drop your scorecard here"
        hint="or click to browse · JPG, PNG, WEBP, HEIC, PDF"
        onFile={onPick}
        className="py-14"
      />
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {failure && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertTitle>{failure.title}</AlertTitle>
            <AlertDescription>
              <span>{failure.detail}</span>
              {onEnterByHand && (
                <Button variant="link" size="sm" className="flex w-fit px-0 has-data-[icon=inline-start]:pl-0" onClick={onEnterByHand}>
                  <PenLine data-icon="inline-start" />
                  Type the scores in instead
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        <FileChip
          name={photo.name}
          sizeBytes={photo.sizeBytes}
          previewUrl={photo.previewUrl}
          onClear={onClear}
        />
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-foreground">What's on your card?</p>
          <ScorecardLayoutPicker onContextChange={onContextChange} />
        </div>
        <Button size="lg" onClick={onExtract}>
          {failure ? (
            <>
              <RotateCw data-icon="inline-start" />
              Read card again
            </>
          ) : (
            <>
              <ScanLine data-icon="inline-start" />
              Extract Scorecard
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function NativePicker({ onPick }: { onPick: (photo: File) => void }) {
  const pick = async (source: "camera" | "photos") => {
    const photo = await pickImageNative(source);
    if (photo) onPick(photo);
  };

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/tint">
          <ScanLine className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Scan your scorecard</p>
          <p className="mt-1 text-xs text-muted-foreground">Take a photo or pick one from your library</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => void pick("camera")}>
            <Camera data-icon="inline-start" />
            Take Photo
          </Button>
          <Button variant="outline" onClick={() => void pick("photos")}>
            <Images data-icon="inline-start" />
            Photo Library
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
