import { Bold, Italic, Underline } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/brand/components/ToggleGroup";

export default function ToggleGroupPreview() {
  return (
    <>
      <ToggleGroup variant="outline" spacing={2} defaultValue={["all"]}>
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="l20">L20</ToggleGroupItem>
        <ToggleGroupItem value="best">Best</ToggleGroupItem>
        <ToggleGroupItem value="hmb">Half Moon Bay</ToggleGroupItem>
      </ToggleGroup>

      <ToggleGroup spacing={2} defaultValue={["italic"]}>
        <ToggleGroupItem value="bold" aria-label="Bold">
          <Bold />
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Italic">
          <Italic />
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Underline">
          <Underline />
        </ToggleGroupItem>
      </ToggleGroup>

      <ToggleGroup variant="outline" size="sm" spacing={2} defaultValue={["left"]}>
        <ToggleGroupItem value="left">Top</ToggleGroupItem>
        <ToggleGroupItem value="center">Bottom</ToggleGroupItem>
        <ToggleGroupItem value="right">Left</ToggleGroupItem>
        <ToggleGroupItem value="justify">Right</ToggleGroupItem>
      </ToggleGroup>

      <ToggleGroup variant="outline" size="lg" spacing={2} defaultValue={["left"]}>
        <ToggleGroupItem value="left">Top</ToggleGroupItem>
        <ToggleGroupItem value="center">Bottom</ToggleGroupItem>
        <ToggleGroupItem value="right">Left</ToggleGroupItem>
        <ToggleGroupItem value="justify">Right</ToggleGroupItem>
      </ToggleGroup>
    </>
  );
}
