import { pebbleBeach } from "@/testing/fixtures/courses";
import { ScanSetupStep } from "../components/ScanSetupStep";
import type { ScanSetupViewModel } from "../useScanSetupViewModel";

const noop = () => {};

const blank: ScanSetupViewModel = {
  courseSearch: { query: "", setQuery: noop, results: [], searching: false, reset: noop },
  linkedName: undefined,
  customName: undefined,
  pickCourse: noop,
  nameCourse: noop,
  clearCourse: noop,
  tees: [],
  loadingTees: false,
  teeBox: "",
  setTeeBox: noop,
  date: "2026-10-15",
  setDate: noop,
  today: "2026-10-15",
  start: noop,
  reset: noop,
};

/**
 * Nothing chosen; a search with a match and the typed name to keep; a saved course with its
 * tees, one picked; and a typed name with the tee typed in.
 */
export default function ScanSetupStepPreview() {
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <ScanSetupStep setup={blank} />
      <ScanSetupStep
        setup={{ ...blank, courseSearch: { ...blank.courseSearch, query: "Pebble", results: [pebbleBeach] } }}
      />
      <ScanSetupStep
        setup={{ ...blank, linkedName: pebbleBeach.name ?? undefined, tees: ["Blue", "White", "Red"], teeBox: "White" }}
      />
      <ScanSetupStep setup={{ ...blank, customName: "Muni Nine", teeBox: "Gold" }} />
    </div>
  );
}
