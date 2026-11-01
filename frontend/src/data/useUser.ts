import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { userRepository, type UserRepository } from "./userRepository";

/**
 * The golfer's profile. Every screen that reads it shares this one query, and a save in Settings
 * (`useUpdateUser`) writes the saved user straight into it.
 */
export function useUser(userId: string, repository: Pick<UserRepository, "getUser"> = userRepository) {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => repository.getUser(userId),
  });
}
