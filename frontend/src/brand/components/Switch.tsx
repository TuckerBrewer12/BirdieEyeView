import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { cn } from "@/brand/cn";

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full bg-input p-0.5 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/half data-[checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none size-5 rounded-full bg-primary-foreground shadow-sm transition-transform data-[checked]:translate-x-5 dark:data-[unchecked]:bg-foreground"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
