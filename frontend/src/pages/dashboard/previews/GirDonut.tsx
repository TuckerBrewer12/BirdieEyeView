import { GirDonut } from "../components/GirDonut";

export default function GirDonutPreview() {
  return (
    <div className="grid grid-cols-2 gap-4">
      <GirDonut pct={39} />
      <GirDonut pct={null} />
    </div>
  );
}
