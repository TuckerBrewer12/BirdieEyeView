import { useIsMutating, useMutation } from "@tanstack/react-query";
import { mutationKeys } from "./queryKeys";
import { scanRepository, type ExtractRequest, type ScanRepository } from "./scanRepository";

/**
 * Reads a photographed card into a round. Nothing is saved: the landing page's visitor
 * isn't signed in, and the scan page saves only once the golfer has reviewed the card.
 */
export function useExtractScorecard(repository: ScanRepository = scanRepository) {
  return useMutation({
    mutationKey: mutationKeys.extractScorecard,
    mutationFn: (request: ExtractRequest) => repository.extract(request),
  });
}

/**
 * Whether a scan is still being read. Unlike `isPending`, it outlives the screen that started
 * the scan, so a golfer who leaves mid-scan comes back to it still running.
 */
export function useIsExtractingScorecard(): boolean {
  return useIsMutating({ mutationKey: mutationKeys.extractScorecard }) > 0;
}
