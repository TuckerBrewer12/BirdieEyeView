import { Reveal } from "@/brand/components/Reveal";

export default function RevealPreview() {
  return (
    <>
      <Reveal className="rounded-card border border-border bg-card p-4 text-sm text-foreground">
        Reveals as it scrolls in.
      </Reveal>
      <Reveal delay={0.2} className="rounded-card border border-border bg-card p-4 text-sm text-foreground">
        Staggered behind it by 0.2s.
      </Reveal>
    </>
  );
}
