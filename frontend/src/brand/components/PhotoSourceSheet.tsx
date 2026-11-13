import * as React from "react";
import { Camera, FileUp, Images } from "lucide-react";
import { ActionSheet, ActionSheetAction, ActionSheetContent, ActionSheetTrigger } from "./ActionSheet";

export type PhotoSource = "camera" | "photos";

interface PhotoSourceSheetProps {
  /** Heads the sheet: what the photo is for. */
  title: string;
  /** What opens the sheet, rendered as its trigger (a `Button`). */
  trigger: React.ReactElement;
  /** The trigger's label. */
  children: React.ReactNode;
  onFile: (file: File) => void;
  /**
   * On a phone app, the camera and the photo library are the app's own (Capacitor's). Without it,
   * each opens the browser's file picker: the camera's asks for the back camera.
   */
  pickNative?: (source: PhotoSource) => Promise<File | null>;
  /** Mime pattern for Choose File, e.g. `image/*,application/pdf`. */
  accept?: string;
}

/**
 * A phone's way to add one photo: an action sheet of Take Photo, Photo Library and Choose File.
 * The file inputs are its own, hidden beside the trigger, so the page only hears which file came.
 */
function PhotoSourceSheet({
  title,
  trigger,
  children,
  onFile,
  pickNative,
  accept = "image/*,application/pdf",
}: PhotoSourceSheetProps) {
  const camera = React.useRef<HTMLInputElement>(null);
  const photos = React.useRef<HTMLInputElement>(null);
  const files = React.useRef<HTMLInputElement>(null);

  const pick = (source: PhotoSource, input: React.RefObject<HTMLInputElement | null>) => {
    if (pickNative) {
      void pickNative(source).then((file) => {
        if (file) onFile(file);
      });
    } else {
      input.current?.click();
    }
  };

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Cleared, so picking the same file again still counts.
    event.target.value = "";
    if (file) onFile(file);
  };

  return (
    <>
      <ActionSheet>
        <ActionSheetTrigger render={trigger}>{children}</ActionSheetTrigger>
        <ActionSheetContent title={title}>
          <ActionSheetAction icon={<Camera aria-hidden />} onClick={() => pick("camera", camera)}>
            Take Photo
          </ActionSheetAction>
          <ActionSheetAction icon={<Images aria-hidden />} onClick={() => pick("photos", photos)}>
            Photo Library
          </ActionSheetAction>
          <ActionSheetAction icon={<FileUp aria-hidden />} onClick={() => files.current?.click()}>
            Choose File
          </ActionSheetAction>
        </ActionSheetContent>
      </ActionSheet>
      <input
        ref={camera}
        data-slot="photo-source-camera"
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
      <input
        ref={photos}
        data-slot="photo-source-library"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onChange}
      />
      <input
        ref={files}
        data-slot="photo-source-file"
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
    </>
  );
}

export { PhotoSourceSheet };
