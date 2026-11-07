import { Alert, AlertAction, AlertDescription } from "@/brand/components/Alert";
import { Button } from "@/brand/components/Button";

interface LoadErrorProps {
  /** What failed, worded by the screen: "Could not load your analytics." */
  message: string;
  /** Asks for the data again. Without it the alert has no Retry button. */
  onRetry?: () => void;
  className?: string;
}

/** What a page shows in place of its content when the data it needs failed to load. */
function LoadError({ message, onRetry, className }: LoadErrorProps) {
  return (
    <Alert variant="destructive" className={className}>
      <AlertDescription>{message}</AlertDescription>
      {onRetry && (
        <AlertAction>
          <Button variant="outline" size="xs" onClick={onRetry}>
            Retry
          </Button>
        </AlertAction>
      )}
    </Alert>
  );
}

export { LoadError };
export type { LoadErrorProps };
