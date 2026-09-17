import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/brand/cn";

interface DropzoneProps {
  title: string;
  hint: string;
  /** Mime pattern for the file input, e.g. `image/*,application/pdf`. */
  accept?: string;
  onFile: (file: File) => void;
  className?: string;
}

/**
 * The drag-and-drop target for picking one file.
 *
 * Owns only the hidden input and the pointer plumbing — which file was picked
 * and what happens to it belong to the caller. Clicking anywhere in the box
 * opens the picker, so the whole area is the control rather than just the text.
 */
function Dropzone({ title, hint, accept = "image/*,application/pdf", onFile, className }: DropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      data-slot="dropzone"
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const file = event.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-input p-8 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
        <Camera className="size-5 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

export { Dropzone };
