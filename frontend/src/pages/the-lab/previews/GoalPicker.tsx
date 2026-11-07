import { benchmarkComparisonFrom } from "@/domain";
import { labBenchmarks } from "@/testing/fixtures/lab";
import { GoalPicker } from "../components/GoalPicker";

const { goals } = benchmarkComparisonFrom(labBenchmarks.alone);

export default function GoalPickerPreview() {
  return (
    <>
      <GoalPicker options={goals} value={89} onChange={() => {}} className="flex-wrap" />
      {/* No goal yet: nothing pressed. */}
      <GoalPicker options={goals} value={null} onChange={() => {}} className="flex-wrap" />
      {/* While a pick saves. */}
      <GoalPicker options={goals} value={79} onChange={() => {}} disabled className="flex-wrap" />
      {/* On a phone: spaced apart, so the row can wrap. */}
      <div className="max-w-sm">
        <GoalPicker options={goals} value={89} onChange={() => {}} spacing={1.5} className="flex-wrap" />
      </div>
    </>
  );
}
