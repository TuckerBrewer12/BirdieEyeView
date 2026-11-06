import { PuttsGauge } from "../components/PuttsGauge";

export default function PuttsGaugePreview() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <PuttsGauge putts={28.4} rating="strong" />
      <PuttsGauge putts={32} rating="fair" />
      <PuttsGauge putts={37.5} rating="weak" />
      <PuttsGauge putts={null} rating={null} />
    </div>
  );
}
