import { Camera, Images, ScanLine } from "lucide-react";
import {
  ActionSheet,
  ActionSheetAction,
  ActionSheetContent,
  ActionSheetTrigger,
  Button,
  Card,
  CardContent,
  Dropzone,
  FileChip,
  ScorecardLayoutPicker,
} from "@/brand";
import { isNative, pickImageNative } from "@/platform/nativeCamera";

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
          <ScanLine data-icon="inline-start" />
          Extract Scorecard
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
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
          <ScanLine className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Scan your scorecard</p>
          <p className="mt-1 text-xs text-muted-foreground">Take a photo or pick one from your library</p>
        </div>
        <ActionSheet>
          <ActionSheetTrigger render={<Button />}>
            <Camera data-icon="inline-start" />
            Add Scorecard
          </ActionSheetTrigger>
          <ActionSheetContent title="Add scorecard">
            <ActionSheetAction icon={<Camera aria-hidden />} onClick={() => void pick("camera")}>
              Take photo
            </ActionSheetAction>
            <ActionSheetAction icon={<Images aria-hidden />} onClick={() => void pick("photos")}>
              Choose from library
            </ActionSheetAction>
          </ActionSheetContent>
        </ActionSheet>
      </CardContent>
    </Card>
  );
}
