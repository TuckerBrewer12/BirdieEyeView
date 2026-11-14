import { NO_CARD_FACTS } from "@/domain/scan";
import { ScanPhotoStepPhone, ScanPhotoStepWide } from "../components/ScanPhotoStep";

const noop = () => {};
const photo = new File(["card"], "physical-card.jpg", { type: "image/jpeg" });
const previewUrl = "/hero/physical-card.jpg";

const blank: Parameters<typeof ScanPhotoStepWide>[0]["step"] = {
  photo: null,
  pickPhoto: noop,
  extract: noop,
  error: null,
  report: { available: false, status: "idle", error: null, submit: noop },
  card: NO_CARD_FACTS,
  setCard: noop,
  courseSearch: { query: "", setQuery: noop, results: [], searching: false, reset: noop },
  presetCourse: null,
  pickPresetCourse: noop,
  clearPresetCourse: noop,
};

const failed = {
  ...blank,
  photo,
  error: "Couldn't read this card. Try a flatter, brighter photo.",
  report: { ...blank.report, available: true },
};

/**
 * A computer's: the drop zone, then a photo beside the form after a failed read. A phone's: the
 * form with its photo row and the error, its button pinned (here in line, at the preview's width).
 */
export default function ScanPhotoStepPreview() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <ScanPhotoStepWide step={blank} previewUrl={null} />
      <ScanPhotoStepWide step={failed} previewUrl={previewUrl} />
      <div className="flex w-preview flex-col gap-4">
        <ScanPhotoStepPhone step={failed} previewUrl={previewUrl} />
      </div>
    </div>
  );
}
