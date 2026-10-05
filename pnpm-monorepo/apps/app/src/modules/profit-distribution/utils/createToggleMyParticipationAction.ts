import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { rejectConflict } from "@/modules/actions/utils/rejectConflict";
import { type AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { type CyclePhase, getCurrentPhase } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import * as z from "zod";

const schema = z.object({
  id: z.cuid2(),
  value: z.stringbool(),
});

interface Configuration {
  readonly requiredPhase: CyclePhase;
  readonly auditEventType:
    | AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED
    | AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED;
  readonly participantData: (
    value: boolean,
    citizenId: string,
  ) =>
    | { acceptedAt: Date | null; acceptedById: string }
    | { cededAt: Date | null; cededById: string };
}

/**
 * Factory for the mirrored toggleMyAccepted/toggleMyCeded actions, which
 * only differ in the cycle phase they are allowed in, the toggled
 * timestamp columns and the emitted audit event.
 */
export const createToggleMyParticipationAction = (
  actionName: string,
  configuration: Configuration,
) =>
  createAuthenticatedAction(
    actionName,
    schema,
    async (formData, authentication, data, t) => {
      /**
       * Authorize the request
       */
      if (!authentication.session.entity)
        return {
          error: t("Common.forbidden"),
          requestPayload: formData,
        };

      /**
       * Validate the request
       */
      const cycle = await prisma.profitDistributionCycle.findUnique({
        where: { id: data.id },
      });
      if (!cycle)
        return {
          error: t("Common.notFound"),
          requestPayload: formData,
        };
      const currentPhase = getCurrentPhase(cycle);
      if (currentPhase !== configuration.requiredPhase) {
        /**
         * A manager or the midnight job changed the phase, and the page must
         * show it.
         */
        return rejectConflict(t("Common.badRequest"), formData);
      }

      const participantData = configuration.participantData(
        data.value,
        authentication.session.entity.id,
      );

      await prisma.profitDistributionCycleParticipant.upsert({
        where: {
          cycleId_citizenId: {
            cycleId: data.id,
            citizenId: authentication.session.entity.id,
          },
        },
        update: participantData,
        create: {
          cycleId: data.id,
          citizenId: authentication.session.entity.id,
          ...participantData,
        },
      });

      refresh();

      await createAuditEvents([
        {
          type: configuration.auditEventType,
          data: {
            cycleId: data.id,
            citizenId: authentication.session.entity.id,
            value: data.value,
          },
          createdById: authentication.session.user.id,
        },
      ]);

      return {
        success: t("Common.successfullySaved"),
      };
    },
  );
