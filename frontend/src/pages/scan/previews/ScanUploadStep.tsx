import { ScanUploadStep } from "../components/ScanUploadStep";
import { scanFailureNotice } from "../present";
import { USER_FACING_ERRORS } from "@/lib/userFacingErrors";

const noop = () => {};

/** Before a photo is picked, on the web and in the phone app, with one picked, and after it failed to scan. */
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
      <ScanUploadStep
        photo={{ name: "half-moon-bay.jpg", sizeBytes: 184320, previewUrl: "/hero/physical-card.jpg" }}
        onPick={noop}
        onClear={noop}
        onContextChange={noop}
        onExtract={noop}
        failure={scanFailureNotice(USER_FACING_ERRORS.scan)}
        onEnterByHand={noop}
        native={false}
      />
    </>
  );
}
