import { PuttsGauge } from "../components/PuttsGauge";

export default function PuttsGaugePreview() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <PuttsGauge putts={28.4} />
      <PuttsGauge putts={32} />
      <PuttsGauge putts={37.5} />
      <PuttsGauge putts={null} />
    </div>
  );
}
