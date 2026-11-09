import { type ReactNode } from "react";
import { Card, CardAction, CardHeader, CardTitle } from "@/brand/components/Card";
import { ToggleGroup, ToggleGroupItem } from "@/brand/components/ToggleGroup";

function Demo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label font-semibold text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

export default function ToggleGroupPreview() {
  return (
    <div className="flex flex-col gap-5">
      <Demo label="Default · 32 · on the page">
        <ToggleGroup aria-label="Range" defaultValue={["last20"]}>
          <ToggleGroupItem value="last5">Last 5</ToggleGroupItem>
          <ToggleGroupItem value="last20">Last 20</ToggleGroupItem>
          <ToggleGroupItem value="all">All</ToggleGroupItem>
        </ToggleGroup>
      </Demo>

      <Demo label="Compact · 28 · inside a card header">
        <Card>
          <CardHeader className="items-center">
            <CardTitle className="font-semibold">Score trend</CardTitle>
            <CardAction className="self-center">
              <ToggleGroup aria-label="Score type" size="sm" defaultValue={["gross"]}>
                <ToggleGroupItem value="gross">Gross</ToggleGroupItem>
                <ToggleGroupItem value="net">Net</ToggleGroupItem>
              </ToggleGroup>
            </CardAction>
          </CardHeader>
        </Card>
      </Demo>

      <Demo label="Full width · mobile · equal segments">
        <ToggleGroup aria-label="Theme" fill defaultValue={["system"]}>
          <ToggleGroupItem value="light">Light</ToggleGroupItem>
          <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
          <ToggleGroupItem value="system">System</ToggleGroupItem>
        </ToggleGroup>
      </Demo>
    </div>
  );
}
