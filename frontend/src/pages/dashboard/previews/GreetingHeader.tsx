import { GreetingHeader } from "../components/GreetingHeader";

export default function GreetingHeaderPreview() {
  return (
    <div className="flex w-preview flex-col gap-6 bg-background p-5">
      <GreetingHeader greeting="Hi, Tucker" handicapIndex={12.4} handicapChange={-1.6} handicapVerdict="good" onHandicapClick={() => {}} />
      <GreetingHeader greeting="Hi, Tucker" handicapIndex={9.8} handicapChange={0.7} handicapVerdict="bad" onHandicapClick={() => {}} />
      <GreetingHeader greeting="Hi, Golfer" handicapIndex={null} handicapChange={null} handicapVerdict={null} onHandicapClick={() => {}} />
    </div>
  );
}
