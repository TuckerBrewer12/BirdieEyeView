import * as React from "react";
import { Button } from "./Button";

type FileButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  /** Mime pattern for the picker, e.g. `image/*,application/pdf`. */
  accept?: string;
  onFile: (file: File) => void;
};

/**
 * A button that opens the file picker for one file: another photo of the card, say. The hidden
 * input is its own, so the page only hears which file came.
 */
function FileButton({ accept, onFile, children, ...props }: FileButtonProps) {
  const input = React.useRef<HTMLInputElement>(null);
  return (
    <>
      <Button {...props} onClick={() => input.current?.click()}>
        {children}
      </Button>
      <input
        ref={input}
        data-slot="file-button-input"
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared, so picking the same file again still counts.
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}

export { FileButton };
