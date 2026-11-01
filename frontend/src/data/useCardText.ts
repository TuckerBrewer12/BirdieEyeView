import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { scanRepository, type ScanRepository } from "./scanRepository";

/** A picked photo, with an id that changes on every pick. */
export interface PickedPhoto {
  id: string;
  file: File;
}

/**
 * The card's text, read as soon as the photo is picked so the scan itself has less to do.
 * It is keyed on the pick, so a new photo never sends an old card's text. Failing is fine:
 * extract reads the card itself. Null until it comes back.
 */
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
