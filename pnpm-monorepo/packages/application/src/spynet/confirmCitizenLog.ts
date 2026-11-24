import { isPrismaError, PrismaErrorCode } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  ConfirmationValue,
  lockCitizen,
  toConfirmationStatus,
  type AuditEventDataByType,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { CitizenLogErrorMessage } from "./citizenErrors.js";
import { syncCitizenIdentityAfterLogChange } from "./citizenIdentitySync.js";
import {
  authorizeCitizenLogOperation,
  getCheckedLogWhere,
  requireActiveCitizenLog,
} from "./citizenLogGuard.js";

export const confirmCitizenLogInputSchema = z.object({
  log_id: idSchema,
  /** The use case cannot remove a decision */
  confirmed: z.enum([
    ConfirmationValue.Confirmed,
    ConfirmationValue.FalseReport,
  ]),
});

export type ConfirmCitizenLogInput = z.infer<
  typeof confirmCitizenLogInputSchema
>;

export interface ConfirmCitizenLogOutput {
  readonly log_id: string;
  readonly citizen_id: string;
  readonly confirmed: ConfirmCitizenLogInput["confirmed"];
}

/** The payload of the system log keeps its texts, it is immutable */
const AUDIT_CONFIRMATION_BY_VALUE = {
  [ConfirmationValue.Confirmed]: "confirmed",
  [ConfirmationValue.FalseReport]: "false-report",
} as const satisfies Record<
  ConfirmCitizenLogInput["confirmed"],
  AuditEventDataByType[AuditEventType.ENTITY_LOG_CONFIRMED]["confirmed"]
>;

/**
 * A unique constraint error of the index of the confirmed Discord IDs of the
 * active citizens (see `Citizen.discordId`). The driver adapter gives the
 * name of the index.
 */
const discordIdIndexErrorSchema = z.object({
  meta: z.object({
    driverAdapterError: z.object({
      cause: z.object({
        constraint: z.object({ index: z.literal("Citizen_discordId_key") }),
      }),
    }),
  }),
});

const isDiscordIdTakenError = (error: unknown) =>
  isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed) &&
  discordIdIndexErrorSchema.safeParse(error).success;

/**
 * A confirmed Discord ID links the citizen to the login of the Discord
 * account. A user who confirms their own Discord ID could thus move their
 * login to a different citizen and get its roles.
 */
const isOwnDiscordId = async (
  context: Pick<ApplicationContext, "prisma">,
  actor: Actor,
  discordId: string,
) =>
  (await context.prisma.account.count({
    where: {
      provider: "discord",
      providerAccountId: discordId,
      userId: actor.userId,
    },
  })) > 0;

/**
 * Only a log without a decision gets one: the UI never offers a change of a
 * decision.
 *
 * @throws NotFoundError when the log does not exist or its citizen is deleted
 * @throws ValidationError for a log type that nobody decides about, for the own
 * Discord ID, and for a Discord ID that a different citizen has
 * @throws ConflictError when somebody decided about the log in the meantime
 */
export const confirmCitizenLog = (
  context: ApplicationContext,
  actor: Actor,
  input: ConfirmCitizenLogInput,
): Promise<ConfirmCitizenLogOutput> =>
  withSpan(context, "confirmCitizenLog", async () => {
    const citizenLog = await requireActiveCitizenLog(context, input.log_id);
    authorizeCitizenLogOperation(actor, citizenLog, "confirm");

    if (
      citizenLog.type === "discord-id" &&
      input.confirmed === ConfirmationValue.Confirmed &&
      citizenLog.content &&
      (await isOwnDiscordId(context, actor, citizenLog.content))
    )
      throw new ValidationError(CitizenLogErrorMessage.OwnDiscordId);

    const checkedLogWhere = getCheckedLogWhere(citizenLog);

    let isUpdated: boolean;
    try {
      isUpdated = await context.prisma.$transaction(async (transaction) => {
        await lockCitizen(transaction, citizenLog.citizenId);

        const { count } = await transaction.citizenLog.updateMany({
          where: { ...checkedLogWhere, confirmed: null },
          data: {
            confirmed: toConfirmationStatus(input.confirmed),
            confirmedAt: context.now(),
            confirmedById: actor.userId,
          },
        });
        if (count === 0) return false;

        await syncCitizenIdentityAfterLogChange(transaction, citizenLog);
        return true;
      });
    } catch (error) {
      /**
       * The Discord ID is the confirmed Discord ID of a different active
       * citizen: its unique index refuses the copy, and the transaction
       * writes nothing
       */
      if (citizenLog.type === "discord-id" && isDiscordIdTakenError(error))
        throw new ValidationError(CitizenLogErrorMessage.DiscordIdTaken, {
          cause: error,
        });
      throw error;
    }

    if (!isUpdated) {
      /**
       * A different user or tab changed the log after the page loaded. Only
       * an unchanged log has a decision now.
       */
      const isAlreadyDecided =
        (await context.prisma.citizenLog.count({ where: checkedLogWhere })) > 0;
      if (isAlreadyDecided)
        throw new ConflictError(CitizenLogErrorMessage.AlreadyDecided);
      throw new NotFoundError(CitizenLogErrorMessage.NotFound);
    }

    await context.audit.create([
      {
        type: AuditEventType.ENTITY_LOG_CONFIRMED,
        data: {
          entityId: citizenLog.citizenId,
          logId: citizenLog.id,
          logType: citizenLog.type,
          confirmed: AUDIT_CONFIRMATION_BY_VALUE[input.confirmed],
        },
        createdById: actor.userId,
      },
    ]);

    return {
      log_id: citizenLog.id,
      citizen_id: citizenLog.citizenId,
      confirmed: input.confirmed,
    };
  });
