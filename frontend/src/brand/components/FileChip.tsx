import { RotateCcw } from "lucide-react";
import { cn } from "@/brand/cn";
import { Button } from "./Button";

interface FileChipProps {
  name: string;
  /** Size in bytes; rendered as whole kilobytes. */
  sizeBytes: number;
  previewUrl?: string | null;
  onClear: () => void;
  className?: string;
}

/** The file a visitor picked, with a thumbnail and a way to start over. */
function FileChip({ name, sizeBytes, previewUrl, onClear, className }: FileChipProps) {
  return (
    <div
      data-slot="file-chip"
      className={cn("flex items-center gap-3 rounded-xl bg-muted p-3", className)}
    >
      {previewUrl && (
        <img
          src={previewUrl}
          alt=""
          className="h-14 w-20 shrink-0 rounded-lg object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{Math.round(sizeBytes / 1024)} KB</p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClear}
        aria-label={`Remove ${name}`}
        className="shrink-0"
      >
        <RotateCcw />
      </Button>
    </div>
  );
}

export { FileChip };
