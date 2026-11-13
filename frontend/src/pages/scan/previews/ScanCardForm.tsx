import { NO_CARD_FACTS } from "@/domain/scan";
import { pebbleBeachSummary } from "@/testing/fixtures/courses";
import { ScanCardForm } from "../components/ScanCardForm";

const noop = () => {};

const blank: Parameters<typeof ScanCardForm>[0]["form"] = {
  card: NO_CARD_FACTS,
  setCard: noop,
  courseSearch: { query: "", setQuery: noop, results: [], searching: false, reset: noop },
  presetCourse: null,
  pickPresetCourse: noop,
  clearPresetCourse: noop,
};

/** Nothing said about the card; then a course picked, a name, scores to par, and putts on the card. */
export default function ScanCardFormPreview() {
  return (
    <div className="flex max-w-lg flex-col gap-8">
      <ScanCardForm form={blank} />
      <ScanCardForm
        form={{
          ...blank,
          card: { ...NO_CARD_FACTS, name: "Tucker", writtenAs: "toPar", putts: true },
          presetCourse: { id: pebbleBeachSummary.id, name: pebbleBeachSummary.name ?? "" },
        }}
      />
    </div>
  );
}
