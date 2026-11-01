import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { userRepository, type UserRepository } from "./userRepository";

/** The golfer's profile. `useUpdateUser` writes the saved one straight into this cache. */
export function useUser(
  userId: string,
  repository: Pick<UserRepository, "getUser"> = userRepository,
) {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => repository.getUser(userId),
  });
}
