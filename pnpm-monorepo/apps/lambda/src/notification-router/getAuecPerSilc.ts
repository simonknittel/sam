// Make sure to mirror this file with app/src/modules/profit-distribution/utils/getAuecPerSilc.ts

export const getAuecPerSilc = (auecProfit: number, totalSilc: number) => {
  return totalSilc > 0 ? Math.round(auecProfit / totalSilc) : 0;
};
