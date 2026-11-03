import { Input } from "@/brand/components/Input";

export default function InputPreview() {
  return (
    <>
      <Input placeholder="Course name" />
      <Input defaultValue="Pebble Beach Golf Links" />
      <Input placeholder="Disabled" disabled />
      <Input placeholder="Invalid" aria-invalid />
      <Input size="inline" placeholder="Inline" />
      <Input size="inline" defaultValue="8.4" className="w-22 text-right" />
    </>
  );
}
