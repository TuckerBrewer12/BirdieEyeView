import * as React from "react";
import { Camera } from "lucide-react";
import { cn } from "@/brand/cn";
import { FileButton } from "./FileButton";

interface DropzoneProps {
  title: string;
  hint?: string;
  actionLabel?: string;
  accept?: string;
  onFile: (file: File) => void;
  className?: string;
}

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
