import { Camera, Image } from "lucide-react";
import {
  ActionSheet,
  ActionSheetAction,
  ActionSheetContent,
} from "@/brand/components/ActionSheet";

export default function ActionSheetPreview() {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-label font-semibold text-muted-foreground">
        Action sheet · mobile · do one
      </div>
      <div className="relative h-117.5 overflow-hidden rounded-2xl bg-border-strong">
        <ActionSheet defaultOpen modal={false}>
          <ActionSheetContent title="Add scorecard" contained initialFocus={false}>
            <ActionSheetAction icon={<Camera aria-hidden />}>Take photo</ActionSheetAction>
            <ActionSheetAction icon={<Image aria-hidden />}>Choose from library</ActionSheetAction>
          </ActionSheetContent>
        </ActionSheet>
      </div>
    </div>
  );
}
