import type { SeasonalWordingFactory } from "./types";

/**
 * One wording of the pool, picked at random on each render of the banner. A
 * citizen thus reads a different greeting on each visit. The pick keeps no
 * memory of the previous visit, thus the same wording can occur two times in
 * sequence. An empty pool has no wording to pick.
 */
export const pickRandomWording = (
  wordings: readonly SeasonalWordingFactory[],
): SeasonalWordingFactory | null => {
  if (wordings.length === 0) return null;

  const index = Math.floor(Math.random() * wordings.length);

  return wordings[index] ?? null;
};
