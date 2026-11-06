import { GoalPicker } from "../components/GoalPicker";

export default function GoalPickerPreview() {
  return (
    <>
      <GoalPicker value={89} onChange={() => {}} className="flex-wrap" />
      {/* No goal yet: nothing pressed. */}
      <GoalPicker value={null} onChange={() => {}} className="flex-wrap" />
      {/* While a pick saves. */}
      <GoalPicker value={79} onChange={() => {}} disabled className="flex-wrap" />
      {/* On a phone: spaced apart, so the row can wrap. */}
      <div className="max-w-sm">
        <GoalPicker value={89} onChange={() => {}} spacing={1.5} className="flex-wrap" />
      </div>
    </>
  );
}
