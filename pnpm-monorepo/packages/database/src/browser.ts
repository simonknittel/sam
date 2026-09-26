// Browser-safe entry point for client components: the enum values, and only
// the types of everything else. A value re-export of the generated
// `browser.ts` would also bundle its `Prisma` namespace, and with it the
// Prisma runtime (Decimal.js and more).
export type * from "./generated/prisma/browser.js";
export * from "./generated/prisma/enums.js";
