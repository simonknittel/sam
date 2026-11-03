import type { ApplicationContext, Logger } from "@sam-monorepo/application";
import type { PrismaClientType } from "@sam-monorepo/database";

export interface PrismaAuditWriterOptions {
  readonly prisma: Pick<PrismaClientType, "auditEvent">;
  readonly log: Logger;
  /**
   * Marks each event as an action through the MCP server. The context of the
   * MCP endpoint sets it, thus the use cases do not know about it.
   */
  readonly triggeredViaMcp?: boolean;
  /**
   * Runs the write at a later time, for example after the response of the
   * request (`after()` of Next.js). Without it, `create()` waits for the
   * write.
   */
  readonly defer?: (write: () => Promise<void>) => void;
}

/**
 * Writes the audit events to the system log. A failed write is logged and
 * swallowed: the mutation that the events describe has happened. A failure
 * after the save must not make the user save again, and must not make an
 * automation do the mutation again on its next run.
 */
export const createPrismaAuditWriter = ({
  prisma,
  log,
  triggeredViaMcp = false,
  defer,
}: PrismaAuditWriterOptions): ApplicationContext["audit"] => ({
  create: async (events) => {
    if (events.length === 0) return;

    // The time of the call, also when the write is deferred: the system log
    // sorts by it
    const createdAt = new Date();

    const write = async () => {
      try {
        await prisma.auditEvent.createMany({
          data: events.map((event) => ({
            type: event.type,
            data: event.data,
            createdAt,
            createdById: event.createdById ?? null,
            triggeredViaMcp,
          })),
        });
      } catch (error) {
        log.error("Failed to write audit events", {
          types: events.map((event) => event.type).join(", "),
          error,
        });
      }
    };

    if (defer) defer(write);
    else await write();
  },
});
