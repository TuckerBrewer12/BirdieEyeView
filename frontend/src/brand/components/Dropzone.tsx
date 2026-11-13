import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/brand/cn";
import { FileButton } from "./FileButton";

interface DropzoneProps {
  title: string;
  /** A line under the title: what can be dropped. */
  hint?: string;
  /** The button that opens the file picker. */
  actionLabel?: string;
  /** Mime pattern for the file input, e.g. `image/*,application/pdf`. */
  accept?: string;
  onFile: (file: File) => void;
  className?: string;
}

/**
 * The drag-and-drop target for picking one file: a dashed box with a camera, a line saying what to
 * drop, and a button that opens the file picker.
 *
 * Owns only the drop plumbing; the button is a `FileButton`. Which file was picked and what happens
 * to it belong to the caller. The box lights up while a file is held over it.
 */
function Dropzone({
  title,
  hint,
  actionLabel = "Choose file",
  accept = "image/*,application/pdf",
  onFile,
  className,
}: DropzoneProps) {
  const [over, setOver] = React.useState(false);

  return (
    <div
      data-slot="dropzone"
      data-over={over || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files.item(0);
        if (file) onFile(file);
      }}
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-input p-8 text-center transition-colors data-over:border-primary data-over:bg-primary/faint",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-primary/tint">
        <Camera aria-hidden className="size-6 text-primary" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-body-lg font-semibold text-foreground">{title}</p>
        {hint && <p className="text-body text-muted-foreground">{hint}</p>}
      </div>
      <FileButton accept={accept} onFile={onFile}>
        {actionLabel}
      </FileButton>
    </div>
  );
}

export { Dropzone };
