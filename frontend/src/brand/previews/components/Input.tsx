import { Checkbox, Input } from "@/brand/components/Input";

export default function InputPreview() {
  return (
    <>
      <Input placeholder="Course name" />
      <Input defaultValue="Pebble Beach Golf Links" />
      <Input placeholder="Disabled" disabled />
      <Input placeholder="Invalid" aria-invalid />
      <Input size="cta" placeholder="you@example.com" />
      <div className="flex items-center gap-3">
        <Checkbox aria-label="Unchecked" />
        <Checkbox defaultChecked aria-label="Checked" />
      </div>
    </>
  );
}
