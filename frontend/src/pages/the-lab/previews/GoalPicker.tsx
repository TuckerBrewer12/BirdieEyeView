import { GoalPicker } from "../components/GoalPicker";

export default function GoalPickerPreview() {
  return (
    <>
      <GoalPicker value={89} onChange={() => {}} />
      {/* No goal yet. */}
      <GoalPicker value={null} onChange={() => {}} />
      {/* While a pick saves. */}
      <GoalPicker value={79} onChange={() => {}} disabled />
    </>
  );
}
