"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createToggleMyParticipationAction } from "../utils/createToggleMyParticipationAction";
import { CyclePhase } from "../utils/getCurrentPhase";

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
