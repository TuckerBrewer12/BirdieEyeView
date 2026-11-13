import { Dropzone } from "@/brand/components/Dropzone";

export default function DropzonePreview() {
  return (
    <Dropzone
      title="Drop a photo of your card"
      hint="JPG, PNG, HEIC or PDF"
      actionLabel="Choose photo"
      onFile={() => {}}
      className="min-h-dropzone"
    />
  );
}
