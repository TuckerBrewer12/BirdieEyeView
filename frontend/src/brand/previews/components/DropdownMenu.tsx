import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/brand/components/DropdownMenu";

const courses = [
  { name: "All courses", rounds: 24 },
  { name: "Presidio Golf Course", rounds: 11 },
  { name: "Half Moon Bay", rounds: 8 },
  { name: "Blue Rock", rounds: 5 },
];

export default function DropdownMenuPreview() {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-label font-semibold text-muted-foreground">
        Dropdown menu · desktop
      </div>
      <div className="h-75 rounded-xl border border-border bg-card p-4">
        <DropdownMenu defaultOpen modal={false}>
          <DropdownMenuTrigger>All courses</DropdownMenuTrigger>
          <DropdownMenuContent aria-label="Course">
            <DropdownMenuRadioGroup value="All courses">
              {courses.map((course) => (
                <DropdownMenuRadioItem key={course.name} value={course.name} detail={course.rounds}>
                  {course.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
