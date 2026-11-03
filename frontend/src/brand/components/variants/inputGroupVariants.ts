import { cva } from "class-variance-authority";

const inputGroupVariants = cva(
  "group/input-group relative flex w-full min-w-0 items-center border border-input transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:bg-input/50 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-1 has-[[data-slot][aria-invalid=true]]:ring-destructive/50 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot=input-group-control]:focus-visible]:ring-ring/30 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/60 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5",
  {
    variants: {
      size: {
        default: "h-11 rounded-card",
        inline: "h-9 rounded-lg",
      },
    },
    defaultVariants: {
      size: "default",
    },
  },
);

const inputGroupAddonVariants = cva(
  "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-addon [&>svg:not([class*='size-'])]:size-4",
  {
    variants: {
      align: {
        "inline-start":
          "order-first pl-3.5 has-[>button]:-ml-3 has-[>kbd]:-ml-1.5 group-data-[size=inline]/input-group:pl-2.5",
        "inline-end":
          "order-last pr-3.5 has-[>button]:-mr-3.25 has-[>kbd]:-mr-1.5 group-data-[size=inline]/input-group:pr-2.5",
        "block-start":
          "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
        "block-end":
          "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2",
      },
    },
    defaultVariants: {
      align: "inline-start",
    },
  },
);

const inputGroupButtonVariants = cva(
  "flex items-center gap-2 text-sm shadow-none",
  {
    variants: {
      size: {
        xs: "h-6 gap-1 rounded-control px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
        sm: "",
        "icon-xs":
          "size-6 rounded-control p-0 has-[>svg]:p-0",
        "icon-sm": "size-8 p-0 has-[>svg]:p-0",
        /* The reveal button on a password field: fills the field's height. */
        "icon-lg":
          "size-10 rounded-lg p-0 text-foreground-secondary has-[>svg]:p-0 [&>svg:not([class*='size-'])]:size-4.5",
      },
    },
    defaultVariants: {
      size: "xs",
    },
  },
);

export { inputGroupVariants, inputGroupAddonVariants, inputGroupButtonVariants };
