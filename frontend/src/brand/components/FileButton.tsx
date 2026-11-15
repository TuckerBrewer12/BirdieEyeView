import * as React from "react";
import { Button } from "./Button";

type FileButtonProps = Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  accept?: string;
  onFile: (file: File) => void;
};

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
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}

export { FileButton };
