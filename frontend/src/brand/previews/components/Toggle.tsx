import { Bold, Italic, Underline } from "lucide-react";
import { Toggle } from "@/brand/components/Toggle";

export default function TogglePreview() {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle aria-label="Bold" defaultPressed>
          <Bold />
        </Toggle>
        <Toggle aria-label="Italic">
          <Italic />
        </Toggle>
        <Toggle aria-label="Underline" disabled>
          <Underline />
        </Toggle>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle variant="outline">Outline</Toggle>
        <Toggle variant="outline" size="sm">
          Small
        </Toggle>
        <Toggle variant="outline" size="lg">
          Large
        </Toggle>
      </div>
    </>
  );
}
