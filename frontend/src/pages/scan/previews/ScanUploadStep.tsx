import { ScanUploadStep } from "../components/ScanUploadStep";

const noop = () => {};

/** Before a photo is picked, on the web and in the phone app, and with one picked. */
export default function ScanUploadStepPreview() {
  return (
    <>
      <ScanUploadStep photo={null} onPick={noop} onClear={noop} onContextChange={noop} onExtract={noop} native={false} />
      <ScanUploadStep photo={null} onPick={noop} onClear={noop} onContextChange={noop} onExtract={noop} native />
      <ScanUploadStep
        photo={{ name: "half-moon-bay.jpg", sizeBytes: 184320, previewUrl: "/hero/physical-card.jpg" }}
        onPick={noop}
        onClear={noop}
        onContextChange={noop}
        onExtract={noop}
        native={false}
      />
    </>
  );
}
