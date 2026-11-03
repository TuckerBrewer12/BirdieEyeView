import { strokesToCheck } from "@/domain";
import { unsureCard } from "@/testing/fixtures/scan";
import { ScanReviewStep } from "../components/ScanReviewStep";
import { reviewedRound, reviewFromScan } from "../scanModel";
import type { ScanReviewViewModel } from "../useScanReviewViewModel";

const noop = () => {};
const draft = reviewFromScan(unsureCard, "2026-10-15");

/** A scanned card with two scores to check, beside the photo it was read from. */
const review: ScanReviewViewModel = {
  round: reviewedRound(draft, null),
  toCheck: strokesToCheck(draft.scan),
  setStrokes: noop,
  setPutts: noop,
  setGir: noop,
  courseSearch: { query: "", setQuery: noop, results: [], searching: false, reset: noop },
  linkedName: undefined,
  customName: undefined,
  nameToKeep: draft.course.name,
  pickCourse: noop,
  nameCourse: noop,
  changeCourse: noop,
  tees: [],
  teeBox: draft.teeBox ?? "",
  setTeeBox: noop,
  date: draft.date,
  setDate: noop,
  today: draft.date,
  saving: false,
  error: null,
  save: noop,
  reset: noop,
};

export default function ScanReviewStepPreview() {
  return <ScanReviewStep review={review} manual={false} photoUrl="/hero/physical-card.jpg" onStartOver={noop} />;
}
