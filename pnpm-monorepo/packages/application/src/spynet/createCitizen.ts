import { isPrismaError, PrismaErrorCode } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE, AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

export const createCitizenInputSchema = z.object({
  spectrum_id: z.string().trim().min(1),
});

export type CreateCitizenInput = z.infer<typeof createCitizenInputSchema>;

export interface CreateCitizenOutput {
  readonly citizen_id: string;
  /**
   * False when an active citizen already has the Spectrum ID: then the
   * output gives that citizen, and nothing changed
   */
  readonly created: boolean;
}

/** A deleted citizen does not block a new one with the same Spectrum ID */
const findActiveCitizenIdBySpectrumId = async (
  context: Pick<ApplicationContext, "prisma">,
  spectrumId: string,
) =>
  (
    await context.prisma.citizen.findFirst({
      where: { spectrumId, ...ACTIVE_CITIZEN_WHERE },
      select: { id: true },
    })
  )?.id ?? null;

/** The creator of a citizen is a citizen, not a login */
export const createCitizen = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateCitizenInput,
): Promise<CreateCitizenOutput> =>
  withSpan(context, "createCitizen", async () => {
    requirePermission(actor, "citizen", "create");
    const creator = requireCitizen(actor);

    const existingCitizenId = await findActiveCitizenIdBySpectrumId(
      context,
      input.spectrum_id,
    );
    if (existingCitizenId)
      return { citizen_id: existingCitizenId, created: false };

    let spectrumIdLog;
    try {
      spectrumIdLog = await context.prisma.citizenLog.create({
        data: {
          type: "spectrum-id",
          content: input.spectrum_id,
          submittedBy: { connect: { id: actor.userId } },
          citizen: {
            create: {
              createdBy: { connect: { id: creator.id } },
              spectrumId: input.spectrum_id,
            },
          },
        },
        select: { id: true, type: true, citizenId: true },
      });
    } catch (error) {
      /**
       * A different user created a citizen with the same Spectrum ID after
       * the check above (the unique index of the active citizens)
       */
      const parallelCitizenId =
        isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed) &&
        (await findActiveCitizenIdBySpectrumId(context, input.spectrum_id));
      if (!parallelCitizenId) throw error;

      return { citizen_id: parallelCitizenId, created: false };
    }

    await context.audit.create([
      {
        type: AuditEventType.CITIZEN_CREATED,
        data: {
          citizenId: spectrumIdLog.citizenId,
          spectrumId: input.spectrum_id,
        },
        createdById: actor.userId,
      },
      {
        type: AuditEventType.ENTITY_LOG_CREATED,
        data: {
          entityId: spectrumIdLog.citizenId,
          logId: spectrumIdLog.id,
          logType: spectrumIdLog.type,
        },
        createdById: actor.userId,
      },
    ]);

    return { citizen_id: spectrumIdLog.citizenId, created: true };
  });
