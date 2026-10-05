import { useLayoutEffect, useRef, type ReactNode } from "react";
import { RoundFlowChart } from "@/brand/charts/RoundFlowChart";
import { Round } from "@/domain";
import { populatedRounds } from "@/testing/fixtures/rounds";

const [overPar, , best] = populatedRounds.map(Round.fromSummary);

/** The chart scrolls sideways in a narrow column; this shows its far end, the back nine. */
function ScrolledToEnd({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const chart = ref.current?.querySelector<HTMLElement>('[data-slot="round-flow-chart"]');
    if (chart) chart.scrollLeft = chart.scrollWidth;
  }, []);
  return <div ref={ref}>{children}</div>;
}

export default function RoundFlowChartPreview() {
  return (
    <>
      <RoundFlowChart round={overPar} />
      <ScrolledToEnd>
        <RoundFlowChart round={overPar} />
      </ScrolledToEnd>
      <ScrolledToEnd>
        <RoundFlowChart round={best} />
      </ScrolledToEnd>
    </>
  );
}
