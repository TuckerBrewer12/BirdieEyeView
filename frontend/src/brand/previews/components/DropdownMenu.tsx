import { Link2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/brand/components/DropdownMenu";

const courses = ["All Courses", "Home Course", "Presidio Golf Course", "Half Moon Bay"];

export default function DropdownMenuPreview() {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-label font-semibold text-muted-foreground">
        Dropdown menu · desktop
      </div>
      <div className="flex h-75 items-start gap-4 rounded-xl border border-border bg-card p-4">
        <DropdownMenu defaultOpen modal={false}>
          <DropdownMenuTrigger size="sm">All Courses</DropdownMenuTrigger>
          <DropdownMenuContent aria-label="Course">
            <DropdownMenuRadioGroup value="All Courses">
              {courses.map((course) => (
                <DropdownMenuRadioItem key={course} value={course}>
                  {course}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="ml-auto">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger variant="ghost" size="sm">
              Date
            </DropdownMenuTrigger>
          </DropdownMenu>
        </div>
      </div>
      <div className="text-label font-semibold text-muted-foreground">
        Action menu · a "More" button&apos;s dots
      </div>
      <div className="flex h-36 items-start justify-end rounded-xl border border-border bg-card p-4">
          <DropdownMenu defaultOpen modal={false}>
            <DropdownMenuTrigger size="icon" chevron={false} aria-label="More actions">
              <MoreHorizontal />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem>
                <Link2 />
                Link to a course
              </DropdownMenuItem>
              <DropdownMenuItem destructive>
                <Trash2 />
                Delete round
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </div>
  );
}
