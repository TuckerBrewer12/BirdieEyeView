import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/brand/cn";

interface DropzoneProps {
  title: string;
  hint: string;
  accept?: string;
  onFile: (file: File) => void;
  className?: string;
}

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
        const file = event.dataTransfer.files.item(0);
        if (file) onFile(file);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-input p-8 transition-colors hover:border-primary/recessed hover:bg-primary/faint focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/half focus-visible:outline-none",
        className,
      )}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-primary/tint">
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
