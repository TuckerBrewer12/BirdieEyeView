import { useState } from "react";
import { LinePicker } from "@/brand/components/LinePicker";

const LINES = [
  { value: "score", label: "Score", swatch: "primary" },
  { value: "birdie", label: "Birdies", swatch: "birdie" },
  { value: "par", label: "Pars", swatch: "par" },
  { value: "bogey", label: "Bogeys", swatch: "bogey" },
  { value: "double", label: "Doubles", swatch: "double" },
  { value: "triple", label: "Triples+", swatch: "triple" },
] as const;

type Line = (typeof LINES)[number]["value"];

export default function LinePickerPreview() {
  const [lines, setLines] = useState<Line[]>(["score", "birdie", "double"]);
  return <LinePicker label="Show" options={LINES} value={lines} onChange={setLines} />;
}
