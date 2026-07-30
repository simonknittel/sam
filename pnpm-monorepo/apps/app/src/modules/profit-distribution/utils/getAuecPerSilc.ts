// Make sure to mirror this file with pnpm-monorepo/apps/lambda/src/functions/notification-router/utils/getAuecPerSilc.ts

export const getAuecPerSilc = (auecProfit: number, totalSilc: number) => {
  // On Vercel auecProfit throws "TypeError: Cannot mix BigInt and other types, use explicit conversions"
  return totalSilc > 0 ? Math.round(Number(auecProfit) / totalSilc) : 0;
};
