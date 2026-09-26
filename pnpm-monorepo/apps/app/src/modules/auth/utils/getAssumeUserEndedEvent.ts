import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import type { AuditEventInput } from "@sam-monorepo/domain";
import type { Session } from "next-auth";

/**
 * The audit event which ends the assume of this session, or nothing for a
 * session of the own user. The admin is the creator of the event.
 */
export const getAssumeUserEndedEvent = (
  session: Session,
): AuditEventInput | null =>
  session.assumedByAdminId
    ? {
        type: AuditEventType.ASSUME_USER_ENDED,
        data: {
          assumedUserId: session.user.id,
          assumedUserName: session.user.name ?? null,
        },
        createdById: session.assumedByAdminId,
      }
    : null;
