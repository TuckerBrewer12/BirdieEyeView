import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { labRepository, type LabRepository } from "./labRepository";

/**
 * The analytics The Lab reads for one golfer: the player, or the friend they compare with.
 * Waits while `userId` is null. Keyed under the golfer's analytics, so whatever refetches
 * those (a profile change, a saved scan) refetches this too.
 */
export function useLabAnalytics(
  userId: string | null,
  repository: Pick<LabRepository, "getAnalytics"> = labRepository,
) {
  return useQuery({
    queryKey: queryKeys.labAnalytics(userId ?? ""),
    queryFn: () => repository.getAnalytics(userId!),
    enabled: userId != null,
  });
}
