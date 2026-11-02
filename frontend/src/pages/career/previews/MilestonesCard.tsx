import { laterCareer, sampleCareer } from "@/testing/fixtures/career";
import { MilestonesCard } from "../components/MilestonesCard";
import { MILESTONE_GROUP_TITLE, NO_NEW_RECORDS, newRecordsNote } from "../present";

const lifetime = sampleCareer.windows.lifetime;
const year = sampleCareer.windows.one_year;

export default function MilestonesCardPreview() {
  return (
    <>
      <MilestonesCard title={MILESTONE_GROUP_TITLE.scoring} milestones={lifetime.scoring} onOpenRound={() => {}} />
      {/* The last year: the server's new personal records, and a note counting them. */}
      <MilestonesCard
        title={MILESTONE_GROUP_TITLE.scoring}
        milestones={year.scoring}
        note={newRecordsNote(year.newRecords ?? 0, sampleCareer.windowDays)}
        onOpenRound={() => {}}
      />
      <MilestonesCard
        title={MILESTONE_GROUP_TITLE.scoring}
        milestones={[]}
        note={newRecordsNote(0, sampleCareer.windowDays)}
        empty={NO_NEW_RECORDS}
        onOpenRound={() => {}}
      />
      {/* Ten months on, only the GIR milestone reached in the last year still counts. */}
      <MilestonesCard
        title={MILESTONE_GROUP_TITLE.gir}
        milestones={laterCareer.windows.one_year.gir}
        onOpenRound={() => {}}
      />
    </>
  );
}
