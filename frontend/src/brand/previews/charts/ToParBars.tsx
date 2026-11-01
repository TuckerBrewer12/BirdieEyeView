import { ToParBars } from "@/brand/charts/ToParBars";

const byHandicap = [0.9, 0.4, 0.6, 0.5, 1.1, 0.7, 0.8, 0.6, 0.3, 0.5, 0.7, 0.4, 0.5, 0.2, 1.0, 0.6, 0.3, -0.1];

export default function ToParBarsPreview() {
  return (
    <>
      <ToParBars
        bars={[
          { label: "Par 3", toPar: 0.62, detail: "96 holes" },
          { label: "Par 4", toPar: 0.58, detail: "240 holes" },
          { label: "Par 5", toPar: -0.12, detail: "96 holes" },
        ]}
      />
      <ToParBars bars={byHandicap.map((toPar, i) => ({ label: String(i + 1), toPar, detail: "24 holes" }))} />
    </>
  );
}
