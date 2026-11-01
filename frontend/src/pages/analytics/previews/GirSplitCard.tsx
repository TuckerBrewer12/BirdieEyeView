import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { GirSplitCard } from "../components/GirSplitCard";
import { analyticsFrom } from "../model";

export default function GirSplitCardPreview() {
  return <GirSplitCard split={analyticsFrom(sampleGolfer.analytics).girSplit} />;
}
