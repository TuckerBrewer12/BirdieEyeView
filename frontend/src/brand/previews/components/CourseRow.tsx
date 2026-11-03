import { Collection } from "@/brand/components/Collection";
import { CourseRow } from "@/brand/components/CourseRow";

const courses = [
  { id: "a", name: "Half Moon Bay Golf Links", location: "Half Moon Bay, CA", rounds: 8, average: 79.4 },
  { id: "b", name: "Presidio Golf Course", location: "San Francisco, CA", rounds: 11, average: 82.1 },
  { id: "c", name: "Blue Rock", location: "Castro Valley, CA", rounds: 5, average: 76.0 },
];

/** Compose-style @Preview for CourseRow. */
export default function CourseRowPreview() {
  return (
    <>
      <p className="text-label font-semibold text-muted-foreground">Course row</p>
      <Collection
        layout="rows"
        className="overflow-hidden rounded-card border border-border bg-card"
        items={courses}
        keyFor={(c) => c.id}
        renderItem={(c) => (
          <CourseRow href="#" name={c.name} location={c.location} rounds={c.rounds} average={c.average} />
        )}
      />
    </>
  );
}
