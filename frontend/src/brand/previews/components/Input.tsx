import { Checkbox, Input } from "@/brand/components/Input";

export default function InputPreview() {
  return (
    <>
      <Input placeholder="Course name" />
      <Input defaultValue="Pebble Beach Golf Links" />
      <Input placeholder="Disabled" disabled />
      <Input placeholder="Invalid" aria-invalid />
      <Input size="inline" placeholder="Inline, beside a button" />
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox defaultChecked />
          Remember me
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox />
          Show net scores
        </label>
      </div>
    </>
  );
}
