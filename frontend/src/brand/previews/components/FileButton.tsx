import { ArrowRight } from "lucide-react";
import { FileButton } from "@/brand/components/FileButton";

export default function FileButtonPreview() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <FileButton accept="image/*" onFile={() => {}}>
        Choose photo
      </FileButton>
      <FileButton variant="outline" accept="image/*" onFile={() => {}}>
        Try another photo
        <ArrowRight data-icon="inline-end" />
      </FileButton>
    </div>
  );
}
