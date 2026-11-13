import { Button } from "@/brand";
import { useCopyText } from "@/platform/useCopyText";

interface YourCodeProps {
  /** The golfer's own friend code; null until the server has one. */
  code: string | null;
}

/** "Your code TGOLF7Q2" with a button to copy it, for the golfer to hand to a friend. */
export function YourCode({ code }: YourCodeProps) {
  const { copy, copied, failed } = useCopyText();

  return (
    <div className="flex items-center gap-2 text-body text-muted-foreground">
      <span>
        Your code{" "}
        <span className="font-bold tracking-chip text-foreground">{code ?? "unavailable"}</span>
      </span>
      {code && (
        <Button
          variant="link"
          size="inline"
          className="ml-auto md:ml-1"
          aria-label={copied ? "Copied" : "Copy your code"}
          onClick={() => void copy(code)}
        >
          {copied ? "Copied" : failed ? "Couldn't copy" : "Copy"}
        </Button>
      )}
    </div>
  );
}
