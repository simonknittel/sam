"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { CyclePhase } from "@sam-monorepo/domain";
import { createToggleMyParticipationAction } from "../utils/createToggleMyParticipationAction";

export const toggleMyAccepted = createToggleMyParticipationAction(
  "toggleMyAccepted",
  {
    requiredPhase: CyclePhase.Payout,
    auditEventType: AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED,
    participantData: (value, citizenId) => ({
      acceptedAt: value ? new Date() : null,
      acceptedById: citizenId,
    }),
  },
);
