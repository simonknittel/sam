export const getAuecPerSilc = (
  auecProfit: number | bigint,
  totalSilc: number,
) => {
  return totalSilc > 0 ? Math.round(Number(auecProfit) / totalSilc) : 0;
};
