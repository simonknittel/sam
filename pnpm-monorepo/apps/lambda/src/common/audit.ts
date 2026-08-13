import { prisma } from "@sam-monorepo/database";
import type { AuditEventInput } from "@sam-monorepo/domain";
import { log } from "./logger";

/**
 * Records what an automation changed in the system log. A failed audit
 * write is logged and swallowed: the mutation it describes has already
 * happened, and letting the automation fail afterwards would retry that
 * mutation on the next run.
 *
 * Automations act on their own behalf and leave `createdById` unset.
 */
export const createAuditEvents = async (events: AuditEventInput[]) => {
  if (events.length <= 0) return;

  try {
    await prisma.auditEvent.createMany({
      data: events.map((event) => ({
        type: event.type,
        data: JSON.stringify(event.data),
        createdById: event.createdById ?? null,
      })),
    });
  } catch (error) {
    void log.error("Failed to write audit event(s)", {
      error,
      types: events.map((event) => event.type).join(", "),
    });
  }
};
