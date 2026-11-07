import { api } from "@/lib/api";
import { Round, type RoundDetail } from "@/domain/round";

/** The round read every screen that opens a round in full shares. */
export interface RoundRepository {
  getRound(roundId: string): Promise<RoundDetail>;
}

export const roundRepository: RoundRepository = {
  getRound: async (roundId) => Round.detailFromDto(await api.getRound(roundId)),
};
