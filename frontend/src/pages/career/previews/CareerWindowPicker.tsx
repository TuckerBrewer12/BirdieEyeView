import { useState } from "react";
import { CareerWindowPicker } from "../components/CareerWindowPicker";
import type { CareerWindow } from "../model";

export default function CareerWindowPickerPreview() {
  const [value, setValue] = useState<CareerWindow>("lifetime");
  return (
    <>
      <CareerWindowPicker value={value} onChange={setValue} windowDays={365} />
      <CareerWindowPicker value="one_year" onChange={() => {}} windowDays={365} />
    </>
  );
}
