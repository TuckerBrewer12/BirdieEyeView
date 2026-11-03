import { GoalPicker } from "../components/GoalPicker";

export default function GoalPickerPreview() {
  return (
    <>
      <GoalPicker value={89} onChange={() => {}} className="flex-wrap" />
      <GoalPicker value={null} onChange={() => {}} className="flex-wrap" />
      <GoalPicker value={79} onChange={() => {}} disabled className="flex-wrap" />
      <div className="max-w-sm">
        <GoalPicker value={89} onChange={() => {}} spacing={1.5} className="flex-wrap" />
      </div>
    </>
  );
}
