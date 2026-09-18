import { FileChip } from "@/brand/components/FileChip";

export default function FileChipPreview() {
  return (
    <>
      <FileChip name="half-moon-bay-back-nine.jpg" sizeBytes={184320} onClear={() => {}} />
      <FileChip name="a-very-long-scorecard-filename-from-a-phone-camera.jpeg" sizeBytes={2411724} onClear={() => {}} />
    </>
  );
}
