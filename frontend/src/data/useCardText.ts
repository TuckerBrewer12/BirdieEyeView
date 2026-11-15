import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { scanRepository, type ScanRepository } from "./scanRepository";

export interface PickedPhoto {
  id: string;
  file: File;
}

export function useCardText(
  photo: PickedPhoto | null,
  repository: ScanRepository = scanRepository,
): string | null {
  const { data } = useQuery({
    queryKey: queryKeys.scanText(photo?.id ?? null),
    queryFn: () => repository.readText(photo!.file),
    enabled: photo != null,
    staleTime: Infinity,
    retry: false,
  });
  return data ?? null;
}
