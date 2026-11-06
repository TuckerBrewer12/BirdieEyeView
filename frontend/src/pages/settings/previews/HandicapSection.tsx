import { HandicapSection } from "../components/HandicapSection";

export default function HandicapSectionPreview() {
  return (
    <div className="flex flex-col gap-4">
      <HandicapSection value="+2.5" error={null} onChange={() => {}} />
      <HandicapSection
        value="sixty"
        error="Handicap must be a number between +10 and 54 (for example +3.0 or 18.4)."
        onChange={() => {}}
      />
    </div>
  );
}
