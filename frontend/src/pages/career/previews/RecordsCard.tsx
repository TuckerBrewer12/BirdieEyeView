import { sampleCareer } from "@/testing/fixtures/career";
import { RecordsCard } from "../components/RecordsCard";

export default function RecordsCardPreview() {
  return (
    <>
      <RecordsCard records={sampleCareer.windows.lifetime.records} onOpenRound={() => {}} />
      {/* No round has set a record yet. */}
      <RecordsCard
        records={sampleCareer.windows.lifetime.records.map((record) => ({ ...record, value: null, event: null }))}
        onOpenRound={() => {}}
      />
    </>
  );
}
