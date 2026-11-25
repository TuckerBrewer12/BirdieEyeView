import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roundsChanged } from "@/data/playerCache";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import type { SaveScanRequestDto } from "@/types/api";

export function useSaveScan(userId: string, repository: ScanRepository = scanRepository) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SaveScanRequestDto) => repository.save(request),
    onSuccess: () => {
      void roundsChanged(queryClient, userId);
    },
  });
}
