import { prisma } from "@/db";
import type { User } from "@/generated/prisma/client";
import type { AuditEventDataByType, AuditEventType } from "./AuditEventTypes";

type AuditEventInput = {
  [Key in AuditEventType]: {
    type: Key;
    data: AuditEventDataByType[Key];
    createdById?: User["id"] | null;
  };
}[AuditEventType];

export const createAuditEvents = async (events: AuditEventInput[]) => {
  return await prisma.auditEvent.createMany({
    data: events.map((event) => ({
      type: event.type,
      data: JSON.stringify(event.data),
      createdById: event.createdById || null,
    })),
  });
};
