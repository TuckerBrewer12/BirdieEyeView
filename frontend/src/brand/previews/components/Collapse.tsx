import { Collapse } from "@/brand/components/Collapse";

function Row({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-card-foreground">
      {label}
    </div>
  );
}

export default function CollapsePreview() {
  return (
    <>
      <Row label="Row with an open panel below it" />
      <Collapse open>
        <div className="rounded-lg border border-border bg-muted px-3 py-6 text-sm text-muted-foreground">
          Revealed content
        </div>
      </Collapse>

      <Row label="Row with a closed panel below it" />
      <Collapse open={false}>
        <div className="rounded-lg border border-border bg-muted px-3 py-6 text-sm text-muted-foreground">
          You should not see this
        </div>
      </Collapse>

      <Row label="Trailing row" />
    </>
  );
}
