import type { ReactNode } from "react";

interface ParTypeRowProps {
  label: string;
  value: string;
  children: ReactNode;
}

export function ParTypeRow({ label, value, children }: ParTypeRowProps) {
  return (
    <div data-slot="par-type-row" className="grid grid-cols-par-bar items-center gap-2.5">
      <span className="text-body font-semibold text-foreground-secondary">{label}</span>
      {children}
      <b className="text-right text-body-lg font-bold">{value}</b>
    </div>
  );
}
