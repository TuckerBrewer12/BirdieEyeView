import type { ReactNode } from "react";
import {
  Checkbox,
  CourseLinkSearch,
  Field,
  FieldLabel,
  Input,
  ToggleGroup,
  ToggleGroupItem,
} from "@/brand";
import { formatCourseName } from "@/domain/course";
import type { ScanPageViewModel } from "../useScanPageViewModel";

type CardForm = Pick<
  ScanPageViewModel,
  "card" | "setCard" | "courseSearch" | "presetCourse" | "pickPresetCourse" | "clearPresetCourse"
>;

/**
 * What the golfer can tell the scan before it reads the card: the course to read it against, their
 * name as written on it, how the scores are written, and which other rows it has.
 */
export function ScanCardForm({ form }: { form: CardForm }) {
  const { card, setCard, courseSearch } = form;
  return (
    <div data-slot="scan-card-form" className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="scan-course">
          Course <span className="font-normal text-muted-foreground">· optional</span>
        </FieldLabel>
        <CourseLinkSearch
          inputId="scan-course"
          surface="plain"
          query={courseSearch.query}
          results={courseSearch.results}
          searching={courseSearch.searching}
          onQueryChange={courseSearch.setQuery}
          onSelectCourse={form.pickPresetCourse}
          onClose={courseSearch.reset}
          linkedName={form.presetCourse ? formatCourseName(form.presetCourse.name) : undefined}
          linkedTitle="Read against this course"
          onClear={form.clearPresetCourse}
          clearLabel="Clear course"
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="scan-name">Your name on the card</FieldLabel>
        <Input
          id="scan-name"
          autoComplete="off"
          placeholder="e.g. Tucker"
          value={card.name}
          onChange={(event) => setCard({ name: event.target.value })}
        />
      </Field>
      <Field>
        <FieldLabel>Scores written as</FieldLabel>
        <ToggleGroup
          fill
          aria-label="Scores written as"
          value={[card.writtenAs]}
          onValueChange={(values) => {
            // Pressing the chosen one again would clear it; one is always chosen.
            if (values[0] === "strokes" || values[0] === "toPar") setCard({ writtenAs: values[0] });
          }}
        >
          <ToggleGroupItem value="strokes">
            Strokes <span className="font-normal text-muted-foreground">4 5 3</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="toPar">
            To par <span className="font-normal text-muted-foreground">+1 −1 E</span>
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-full text-body font-semibold text-foreground md:mr-1 md:w-auto">Also on the card</span>
        <CheckChip checked={card.putts} onChange={(putts) => setCard({ putts })}>
          Putts
        </CheckChip>
        <CheckChip checked={card.shotsToGreen} onChange={(shotsToGreen) => setCard({ shotsToGreen })}>
          Shots to green
        </CheckChip>
      </div>
    </div>
  );
}

function CheckChip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-input bg-card px-3 text-body text-foreground">
      <Checkbox checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {children}
    </label>
  );
}
