"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { CyclePhase } from "@sam-monorepo/domain";
import { createToggleMyParticipationAction } from "../utils/createToggleMyParticipationAction";

export const toggleMyCeded = createToggleMyParticipationAction(
  "toggleMyCeded",
  {
    requiredPhase: CyclePhase.Collection,
    auditEventType: AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED,
    participantData: (value, citizenId) => ({
      cededAt: value ? new Date() : null,
      cededById: citizenId,
    }),
  },
);
