import {
  Button,
  Card,
  CardContent,
  CourseLinkSearch,
  Field,
  FieldLabel,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { formatCourseName } from "@/lib/courseName";
import type { ScanSetupViewModel } from "../useScanSetupViewModel";

/**
 * Before typing scores in by hand: the course (a saved one, or a name to keep), the tee and
 * the date. All of it can be changed again on the card.
 */
export function ScanSetupStep({ setup }: { setup: ScanSetupViewModel }) {
  return (
    <Card size="sm" data-slot="scan-setup">
      <CardContent className="flex flex-col gap-4">
        <CourseField setup={setup} />
        <TeeField setup={setup} />
        <Field>
          <FieldLabel htmlFor="setup-date">Date played</FieldLabel>
          <Input
            id="setup-date"
            type="date"
            value={setup.date}
            max={setup.today}
            onChange={(e) => setup.setDate(e.target.value)}
          />
        </Field>
        <Button size="lg" onClick={setup.start}>
          Start Entering Scores
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
        Course <span className="font-normal text-muted-foreground">(optional)</span>
      </FieldLabel>
      <CourseLinkSearch
        inputId="setup-course"
        query={courseSearch.query}
        results={courseSearch.results}
        searching={courseSearch.searching}
        onQueryChange={courseSearch.setQuery}
        onSelectCourse={setup.pickCourse}
        onClose={courseSearch.reset}
        autoFocus={false}
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

/** The picked course's tees to choose from, else a box to type the tee into. */
function TeeField({ setup }: { setup: ScanSetupViewModel }) {
  const pick = setup.tees.length > 0;
  return (
    <Field>
      <FieldLabel htmlFor={pick ? undefined : "setup-tee"}>Tee played</FieldLabel>
      {pick ? (
        <ToggleGroup
          variant="outline"
          size="sm"
          aria-label="Tee played"
          value={setup.teeBox ? [setup.teeBox] : []}
          onValueChange={(values) => setup.setTeeBox(values[0] ?? "")}
        >
          {setup.tees.map((color) => (
            <ToggleGroupItem key={color} value={color}>
              {color}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      ) : (
        <Input
          id="setup-tee"
          autoComplete="off"
          placeholder={setup.loadingTees ? "Loading tees…" : "e.g. White"}
          disabled={setup.loadingTees}
          value={setup.teeBox}
          onChange={(e) => setup.setTeeBox(e.target.value)}
        />
      )}
    </Field>
  );
}
