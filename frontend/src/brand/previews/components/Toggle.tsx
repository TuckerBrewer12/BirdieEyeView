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
        <Toggle defaultPressed>Default</Toggle>
        <Toggle size="sm">Small</Toggle>
      </div>
    </>
  );
}
