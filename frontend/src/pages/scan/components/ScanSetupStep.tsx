import {
  Button,
  Card,
  CardContent,
  CourseLinkSearch,
  Field,
  FieldLabel,
  Input,
} from "@/brand";
import { formatCourseName } from "@/domain/course";
import { TeeField } from "./TeeField";
import type { ScanSetupViewModel } from "../useScanSetupViewModel";

/**
 * Before typing scores in by hand: the course (a saved one, or a name to keep), the tee and
 * the date. All of it can be changed again on the card.
 */
export function ScanSetupStep({ setup }: { setup: ScanSetupViewModel }) {
  return (
    <Card data-slot="scan-setup">
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 items-start gap-3 md:grid-cols-scan-manual">
          <div className="col-span-2 md:col-span-1">
            <CourseField setup={setup} />
          </div>
          <TeeField
            id="setup-tee"
            tees={setup.tees}
            teeBox={setup.teeBox}
            setTeeBox={setup.setTeeBox}
            placeholder={setup.loadingTees ? "Loading tees…" : undefined}
            disabled={setup.loadingTees}
          />
          <Field>
            <FieldLabel htmlFor="setup-date">Date</FieldLabel>
            <Input
              id="setup-date"
              type="date"
              value={setup.date}
              max={setup.today}
              onChange={(e) => setup.setDate(e.target.value)}
            />
          </Field>
        </div>
        <Button size="lg" className="md:self-end" onClick={setup.start}>
          Enter scores
        </Button>
      </CardContent>
    </Card>
  );
}

function CourseField({ setup }: { setup: ScanSetupViewModel }) {
  const { courseSearch } = setup;
  return (
    <Field>
      <FieldLabel htmlFor="setup-course">
        Course <span className="font-normal text-muted-foreground">· optional</span>
      </FieldLabel>
      <CourseLinkSearch
        inputId="setup-course"
        surface="plain"
        query={courseSearch.query}
        results={courseSearch.results}
        searching={courseSearch.searching}
        onQueryChange={courseSearch.setQuery}
        onSelectCourse={setup.pickCourse}
        onClose={courseSearch.reset}
        reviewVariant
        onUseCustomName={setup.nameCourse}
        linkedName={setup.linkedName ? formatCourseName(setup.linkedName) : undefined}
        customName={setup.customName ? formatCourseName(setup.customName) : undefined}
        onClear={setup.clearCourse}
        clearLabel="Change course"
      />
    </Field>
  );
}
