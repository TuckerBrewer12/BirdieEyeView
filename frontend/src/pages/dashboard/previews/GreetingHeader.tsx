import { GreetingHeader } from "../components/GreetingHeader";

const line = [14.1, 13.8, 13.9, 13.2, 12.9, 12.4];

export default function GreetingHeaderPreview() {
  return (
    <div className="flex w-preview flex-col gap-6 bg-background p-5">
      <GreetingHeader
        greeting="Good evening"
        name="Tucker"
        handicap={{ index: 12.4, change: -1.6, verdict: "good" }}
        handicapLine={line}
        onHandicapClick={() => {}}
      />
      <GreetingHeader
        compact
        greeting="Good evening"
        name="Tucker"
        handicap={{ index: 12.4, change: -1.6, verdict: "good" }}
        handicapLine={line}
        onHandicapClick={() => {}}
      />
      <GreetingHeader
        compact
        greeting="Good morning"
        name="Golfer"
        handicap={{ index: null, change: null, verdict: null }}
        handicapLine={[]}
        onHandicapClick={() => {}}
      />
    </div>
  );
}
