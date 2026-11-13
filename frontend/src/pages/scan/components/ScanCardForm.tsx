import { CardFactsForm, Field, FieldLabel } from "@/brand";
import type { ScanPageViewModel } from "../useScanPageViewModel";
import { PresetCourseField } from "./PresetCourseField";

type CardForm = Pick<
  ScanPageViewModel,
  "card" | "setCard" | "courseSearch" | "presetCourse" | "pickPresetCourse" | "clearPresetCourse"
>;

/** What the golfer can tell the scan before it reads the card: the course, then the card's facts. */
export function ScanCardForm({ form }: { form: CardForm }) {
  return (
    <div data-slot="scan-card-form" className="flex flex-col gap-4">
      <Field>
        <FieldLabel htmlFor="scan-course">
          Course <span className="font-normal text-muted-foreground">· optional</span>
        </FieldLabel>
        <PresetCourseField course={form} inputId="scan-course" />
      </Field>
      <CardFactsForm card={form.card} onChange={form.setCard} idPrefix="scan" />
    </div>
  );
}
