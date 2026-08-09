import { prisma } from "@sam-monorepo/database";
import { log } from "./logger";

interface AuditEventInput {
  /**
   * Must match a member of the app's `AuditEventType` — the enum lives in
   * the app (which renders the system log) and the database column is a
   * plain string, so it can't be imported here.
   */
  type: string;
  data: Record<string, unknown>;
  /** Automations act on their own behalf and leave this unset */
  createdById?: string | null;
}

/**
 * Records what an automation changed in the system log. A failed audit
 * write is logged and swallowed: the mutation it describes has already
 * happened, and letting the automation fail afterwards would retry that
 * mutation on the next run.
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
