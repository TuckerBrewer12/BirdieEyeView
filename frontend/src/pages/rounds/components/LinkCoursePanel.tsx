import { Alert, AlertDescription, CourseLinkSearch } from "@/brand";
import { useLinkCoursePanelViewModel } from "./useLinkCoursePanelViewModel";

interface LinkCoursePanelProps {
  userId: string;
  roundId: string;
  title?: string;
  onClose: () => void;
  onLinked: () => void;
  surface?: "card" | "plain";
}

export function LinkCoursePanel({ userId, roundId, title, onClose, onLinked, surface = "card" }: LinkCoursePanelProps) {
  const viewModel = useLinkCoursePanelViewModel(userId, roundId, onLinked);

  return (
    <div className="flex flex-col gap-2.5">
      {viewModel.error && (
        <Alert tone="danger">
          <AlertDescription>{viewModel.error}</AlertDescription>
        </Alert>
      )}
      <CourseLinkSearch
        title={title}
        query={viewModel.query}
        results={viewModel.results}
        searching={viewModel.searching}
        linking={viewModel.linking}
        onQueryChange={viewModel.setQuery}
        onSelectCourse={viewModel.selectCourse}
        onClose={onClose}
        surface={surface}
        focusOnOpen
      />
    </div>
  );
}
