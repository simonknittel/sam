import {
  AuditEventType,
  CyclePhase,
  getCurrentPhase,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { CYCLE_PHASE_SELECT } from "./cycleSelects.js";
import {
  ParticipantAttribute,
  getAttributeData,
  upsertParticipant,
} from "./participantAttributes.js";
import { ProfitDistributionErrorMessage } from "./profitDistributionErrors.js";

export const setOwnParticipationInputSchema = z.object({
  cycle_id: idSchema,
  enabled: z
    .boolean()
    .describe("True: set the state for the own citizen. False: remove it."),
});

export type SetOwnParticipationInput = z.infer<
  typeof setOwnParticipationInputSchema
>;

export interface SetOwnParticipationOutput {
  readonly cycle_id: string;
  readonly citizen_id: string;
  readonly enabled: boolean;
}

interface Configuration {
  readonly requiredPhase: CyclePhase;
  readonly attribute:
    ParticipantAttribute.Accepted | ParticipantAttribute.Ceded;
  readonly auditEventType:
    | AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED
    | AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED;
}

/** Requires only a citizen: each member decides about their own share */
const setOwnParticipation = async (
  context: ApplicationContext,
  actor: Actor,
  input: SetOwnParticipationInput,
  configuration: Configuration,
): Promise<SetOwnParticipationOutput> => {
  const citizen = requireCitizen(actor);

  const cycle = await context.prisma.profitDistributionCycle.findUnique({
    where: { id: input.cycle_id },
    select: CYCLE_PHASE_SELECT,
  });
  if (!cycle)
    throw new NotFoundError(ProfitDistributionErrorMessage.CycleNotFound);
  // A manager or the midnight job changed the phase
  if (getCurrentPhase(cycle) !== configuration.requiredPhase)
    throw new ConflictError(ProfitDistributionErrorMessage.WrongPhase);

  await upsertParticipant(
    context.prisma,
    input.cycle_id,
    citizen.id,
    getAttributeData(
      configuration.attribute,
      input.enabled,
      citizen.id,
      context.now(),
    ),
  );

  await context.audit.create([
    {
      type: configuration.auditEventType,
      data: {
        cycleId: input.cycle_id,
        citizenId: citizen.id,
        value: input.enabled,
      },
      createdById: actor.userId,
    },
  ]);

  return {
    cycle_id: input.cycle_id,
    citizen_id: citizen.id,
    enabled: input.enabled,
  };
};

export const setOwnPayoutAccepted = (
  context: ApplicationContext,
  actor: Actor,
  input: SetOwnParticipationInput,
): Promise<SetOwnParticipationOutput> =>
  withSpan(context, "setOwnPayoutAccepted", () =>
    setOwnParticipation(context, actor, input, {
      requiredPhase: CyclePhase.Payout,
      attribute: ParticipantAttribute.Accepted,
      auditEventType: AuditEventType.PROFIT_DISTRIBUTION_MY_ACCEPTED_TOGGLED,
    }),
  );

/** The share goes to the other participants */
export const setOwnShareCeded = (
  context: ApplicationContext,
  actor: Actor,
  input: SetOwnParticipationInput,
): Promise<SetOwnParticipationOutput> =>
  withSpan(context, "setOwnShareCeded", () =>
    setOwnParticipation(context, actor, input, {
      requiredPhase: CyclePhase.Collection,
      attribute: ParticipantAttribute.Ceded,
      auditEventType: AuditEventType.PROFIT_DISTRIBUTION_MY_CEDED_TOGGLED,
    }),
  );
