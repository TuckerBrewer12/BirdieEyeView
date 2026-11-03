import { useState } from "react";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { RangeViewCard } from "../components/RangeViewCard";
import { analyticsFrom, defaultRangePar, type RangePar } from "../model";

const buckets = analyticsFrom(sampleGolfer.analytics).yardageBuckets;

export default function RangeViewCardPreview() {
  const [par, setPar] = useState<RangePar>(defaultRangePar(buckets));
  return (
    <>
      <RangeViewCard buckets={buckets} par={par} onParChange={setPar} />
      <RangeViewCard buckets={buckets.filter((bucket) => bucket.par === 4)} par={3} onParChange={() => {}} />
    </>
  );
}
