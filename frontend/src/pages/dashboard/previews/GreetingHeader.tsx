import { GreetingHeader } from "../components/GreetingHeader";

export default function GreetingHeaderPreview() {
  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader firstName="Test" dateLabel="Mon · Jun 15" handicapIndex={12.4} handicapChange={-1.6} onHandicapClick={() => {}} />
      <GreetingHeader firstName="Sam" dateLabel="Sat · Oct 3" handicapIndex={-1.2} handicapChange={0.4} onHandicapClick={() => {}} />
      <GreetingHeader firstName="Golfer" dateLabel="Tue · Jan 6" handicapIndex={null} handicapChange={null} onHandicapClick={() => {}} />
    </div>
  );
}
