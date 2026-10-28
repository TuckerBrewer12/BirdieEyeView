import { useMutation } from "@tanstack/react-query";
import { scanRepository, type ExtractRequest, type ScanRepository } from "@/data/scanRepository";

/** Reads a photographed card into a round. Nothing is saved; the visitor isn't signed in. */
export function useExtractScorecard(repository: ScanRepository = scanRepository) {
  return useMutation({ mutationFn: (request: ExtractRequest) => repository.extract(request) });
}
