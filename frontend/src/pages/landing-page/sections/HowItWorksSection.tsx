import { Camera, Bot, TrendingUp } from "lucide-react";
import { ScrollSection } from "@/components/analytics/ScrollSection";
import { PublicScanHero } from "@/components/public/PublicScanHero";
import { LANDING_SECTIONS } from "../useLandingPageViewModel";

const STEPS = [
  {
    number: "01",
    icon: Camera,
    title: "Snap Your Scorecard",
    desc: "Take a photo of the physical scorecard after your round — no need to do anything during play.",
  },
  {
    number: "02",
    icon: Bot,
    title: "We Read It",
    desc: "Our AI instantly detects every score, yardage, and par from the card — including messy handwriting.",
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Get Your Stats",
    desc: "Handicap tracking, GIR, putts per round, and milestone progress — all calculated automatically.",
  },
];

export function HowItWorksSection() {
  return (
    <section id={LANDING_SECTIONS.howItWorks} className="bg-card py-24">
      <div className="mx-auto max-w-5xl px-6">
        <ScrollSection>
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-eyebrow text-primary">How It Works</p>
            <h2 className="text-4xl font-extrabold tracking-display text-foreground">
              Three steps. Under a minute.
            </h2>
          </div>
        </ScrollSection>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <ScrollSection key={step.number} delay={i * 0.2}>
                <div className="flex flex-col">
                  <span className="-mb-4 leading-none text-8xl font-black text-muted select-none">
                    {step.number}
                  </span>
                  <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="size-5 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </ScrollSection>
            );
          })}
        </div>

        <ScrollSection delay={0.3}>
          <div id={LANDING_SECTIONS.tryItOut} className="mx-auto mt-20 max-w-2xl">
            <PublicScanHero />
          </div>
        </ScrollSection>
      </div>
    </section>
  );
}
