import { LoadError } from "@/brand/components/LoadError";

export default function LoadErrorPreview() {
  return (
    <>
      <LoadError message="Could not load your analytics." onRetry={() => {}} />

      {/* Nothing to retry: the round is gone. */}
      <LoadError message="Could not load this round." />
    </>
  );
}
