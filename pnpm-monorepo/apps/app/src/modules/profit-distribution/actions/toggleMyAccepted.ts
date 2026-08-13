"use server";

import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createToggleMyParticipationAction } from "../utils/createToggleMyParticipationAction";
import { CyclePhase } from "../utils/getCurrentPhase";

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
