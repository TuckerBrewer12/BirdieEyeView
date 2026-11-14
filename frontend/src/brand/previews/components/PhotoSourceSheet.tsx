import { Camera } from "lucide-react";
import { Button } from "@/brand/components/Button";
import { PhotoSourceSheet } from "@/brand/components/PhotoSourceSheet";

export default function PhotoSourceSheetPreview() {
  return (
    <PhotoSourceSheet title="Add scorecard photo" trigger={<Button size="lg" />} onFile={() => {}}>
      <Camera data-icon="inline-start" />
      Add scorecard photo
    </PhotoSourceSheet>
  );
}
