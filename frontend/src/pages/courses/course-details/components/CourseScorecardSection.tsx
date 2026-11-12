import { Card, CardContent, TeePicker } from "@/brand";
import { teeOption } from "../courseDetailModel";
import { NineTable } from "./NineTable";
import { useCourseScorecardViewModel } from "./useCourseScorecardViewModel";

interface CourseScorecardSectionProps {
  userId: string;
  courseId: string;
}

export function CourseScorecardSection({ userId, courseId }: CourseScorecardSectionProps) {
  const viewModel = useCourseScorecardViewModel(userId, courseId);
  if (!viewModel) return null;
  const teeOptions = viewModel.tees.flatMap(({ tee }) => teeOption(tee) ?? []);

  return (
    <>
      {teeOptions.length > 0 && (
        <TeePicker
          tees={teeOptions}
          value={viewModel.selectedTee ?? ""}
          onChange={viewModel.selectTee}
          onClear={viewModel.clearTee}
          className="mb-5"
        />
      )}

      <Card className="overflow-x-auto py-0">
        <CardContent className="min-w-scorecard px-0">
          <NineTable nine={viewModel.frontNine} />
          <div className="border-t-2 border-border" />
          <NineTable nine={viewModel.backNine} />
        </CardContent>
      </Card>
    </>
  );
}
