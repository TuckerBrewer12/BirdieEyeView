import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { userRepository, type UserRepository } from "./userRepository";

export function useUser(userId: string, repository: Pick<UserRepository, "getUser"> = userRepository) {
  return useQuery({
    queryKey: queryKeys.user(userId),
    queryFn: () => repository.getUser(userId),
  });
}
