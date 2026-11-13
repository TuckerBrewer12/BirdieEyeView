import { GolfGroup } from "../components/GolfGroup";

const noop = () => {};

export default function GolfGroupPreview() {
  return (
    <div className="flex flex-col gap-4">
      <GolfGroup
        handicap="8.4"
        handicapError={null}
        onHandicapChange={noop}
        homeCourse="Pebble Beach Golf Links"
        onOpenHomeCourse={noop}
        friendCode="BIRD-1234"
      />
      <GolfGroup
        handicap="60"
        handicapError="Handicap must be between +10 and 54."
        onHandicapChange={noop}
        homeCourse={null}
        onOpenHomeCourse={noop}
        friendCode={null}
      />
    </div>
  );
}
