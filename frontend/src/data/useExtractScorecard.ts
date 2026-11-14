import { useIsMutating, useMutation } from "@tanstack/react-query";
import { mutationKeys } from "./queryKeys";
import { scanRepository, type ExtractRequest, type ScanRepository } from "./scanRepository";

export function useExtractScorecard(repository: ScanRepository = scanRepository) {
  return useMutation({
    mutationKey: mutationKeys.extractScorecard,
    mutationFn: (request: ExtractRequest) => repository.extract(request),
  });
}

export function useIsExtractingScorecard(): boolean {
  return useIsMutating({ mutationKey: mutationKeys.extractScorecard }) > 0;
}
