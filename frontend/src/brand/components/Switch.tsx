import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/brand/cn";

/**
 * An on/off control that applies at once, 44 by 26. For a choice that needs
 * a Save, use a checkbox; for two or three named options, a segmented choice
 * (`SettingsRow`'s "choose" row).
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-6.5 w-11 shrink-0 cursor-pointer items-center rounded-full bg-input outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none absolute left-0.75 top-0.75 size-5 rounded-full bg-primary-foreground shadow-sm dark:data-[unchecked]:bg-foreground transition-transform data-[checked]:translate-x-4.5"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
