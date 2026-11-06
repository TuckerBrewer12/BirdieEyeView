import { sampleCareer } from "@/testing/fixtures/career";
import { TotalsCard } from "../components/TotalsCard";
import { totalsTitle } from "../present";

export default function TotalsCardPreview() {
  return (
    <>
      <TotalsCard title={totalsTitle("lifetime")} totals={sampleCareer.windows.lifetime.totals} />
      <TotalsCard title={totalsTitle("one_year")} totals={sampleCareer.windows.one_year.totals} />
    </>
  );
}
