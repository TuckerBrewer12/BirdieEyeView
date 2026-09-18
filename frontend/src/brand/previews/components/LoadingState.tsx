import { LoadingState } from "@/brand/components/LoadingState";

export default function LoadingStatePreview() {
  return (
    <>
      <div className="rounded-xl border border-border bg-card">
        <LoadingState>Loading rounds...</LoadingState>
      </div>

      {/* Shorter, for a section rather than a whole page. */}
      <div className="rounded-xl border border-border bg-card">
        <LoadingState className="h-32 text-sm">Loading courses...</LoadingState>
      </div>
    </>
  );
}
