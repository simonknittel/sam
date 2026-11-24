import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env.js";
import { PrismaClient } from "./generated/prisma/client.js";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
  /**
   * The adapter writes dates as UTC text without an offset and reads a
   * timestamptz without a conversion, thus each connection must use UTC
   */
  options: "-c TimeZone=UTC",
});

const createPrismaClient = () =>
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    /**
     * Secrets and large columns that must never reach a query result by
     * accident, for example through a whole-row read.
     *
     * Deliberately not listed:
     * - `Session.sessionToken`: the NextAuth adapter must return it from its
     *   own session read, so a global omit would break authentication.
     * - `VerificationToken.token` and `EmailConfirmationToken.token`: looked up
     *   by a `where` clause and never read back into a result that leaves the
     *   server; the confirmation token is also a primary key.
     *
     * The only reader that needs a listed secret is the Web Push send path.
     * Nothing reads the Discord OAuth tokens back from the database.
     */
    omit: {
      account: {
        access_token: true,
        refresh_token: true,
        id_token: true,
        session_state: true,
      },
      webPushSubscription: {
        p256dh: true,
        auth: true,
      },
      /** Large columns. A write without `select` would return them too. */
      wikiPage: {
        ydoc: true,
        content: true,
        searchText: true,
      },
      wikiPageSnapshot: {
        content: true,
      },
    },
  });

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();
export type PrismaClientType = typeof prisma;

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "./generated/prisma/client.js";
