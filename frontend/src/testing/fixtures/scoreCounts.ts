import type { ScoreCountsDto } from "@/types/api";

export const NO_COUNTS: ScoreCountsDto = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0 };

export function countsFor(toPar: number): ScoreCountsDto {
  const birdie = toPar < 0 ? 1 - toPar : toPar < 6 ? 2 : 1;
  const over = toPar + birdie;
  let bogey = over;
  let double = 0;
  while (birdie + bogey + double > 18 || double < Math.floor(over / 4)) {
    bogey -= 2;
    double += 1;
  }
  return { ...NO_COUNTS, birdie, par: 18 - birdie - bogey - double, bogey, double };
}
