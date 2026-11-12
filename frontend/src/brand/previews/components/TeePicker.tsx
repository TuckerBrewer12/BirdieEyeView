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
      {/* A tee with no yardage on file shows its name alone. */}
      <TeePicker tees={[{ name: "Gold", yards: null }, { name: "Combo", yards: 6420 }]} value="" onChange={() => {}} />
    </>
  );
}
