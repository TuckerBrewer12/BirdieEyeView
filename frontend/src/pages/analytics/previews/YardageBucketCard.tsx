import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { YardageBucketCard } from "../components/YardageBucketCard";
import { analyticsFrom } from "../model";

const buckets = analyticsFrom(sampleGolfer.analytics).yardageBuckets;
const busiest = [...buckets].sort((a, b) => b.holes - a.holes)[0];

export default function YardageBucketCardPreview() {
  return (
    <div className="flex flex-col gap-4">
      <YardageBucketCard bucket={busiest} />
      <YardageBucketCard bucket={{ ...busiest, label: "500+", holes: 0, girPercent: null, results: [] }} />
    </div>
  );
}
