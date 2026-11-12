import { useState } from "react";
import { TeePicker } from "@/brand/components/TeePicker";

const TEES = [
  { name: "Black", yards: 7012 },
  { name: "Blue", yards: 6697 },
  { name: "White", yards: 6214 },
  { name: "Red", yards: 5402 },
];

export default function TeePickerPreview() {
  const [tee, setTee] = useState("Blue");
  return (
    <>
      <TeePicker tees={TEES} value={tee} onChange={setTee} />
      {/* The course page's: rating, slope and course handicap after the yardage, and a press clears it. */}
      <TeePicker
        tees={[
          { name: "Blue", yards: 6697, detail: "72.4 / 130 · CH 12" },
          { name: "White", yards: 6214, detail: "70.1 / 124 · CH 9" },
        ]}
        value="White"
        onChange={() => {}}
        onClear={() => {}}
      />
      {/* A tee with no yardage on file shows its name alone. */}
      <TeePicker tees={[{ name: "Gold", yards: null }, { name: "Combo", yards: 6420 }]} value="" onChange={() => {}} />
    </>
  );
}
