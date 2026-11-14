import { sampleCareer } from "@/testing/fixtures/career";
import { RecordsCard } from "../components/RecordsCard";

export default function RecordsCardPreview() {
  return (
    <>
      <RecordsCard records={sampleCareer.windows.lifetime.records} onOpenRound={() => {}} />
      <RecordsCard
        records={sampleCareer.windows.lifetime.records.map((record) => ({ ...record, value: null, event: null }))}
        onOpenRound={() => {}}
      />
    </>
  );
}
