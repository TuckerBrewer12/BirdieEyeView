import { FirstRoundCard } from "../components/FirstRoundCard";

export default function FirstRoundCardPreview() {
  return (
    <div className="flex flex-col gap-6 bg-background p-5">
      <div className="w-240">
        <FirstRoundCard />
      </div>
      <div className="w-88">
        <FirstRoundCard compact />
      </div>
    </div>
  );
}
