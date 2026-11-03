import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { settingsRepository, type SettingsRepository } from "./settingsRepository";

export function useSettings(userId: string, repository: SettingsRepository = settingsRepository) {
  return useQuery({
    queryKey: queryKeys.settings(userId),
    queryFn: () => repository.getSettings(userId),
  });
}
