import type { ConfirmationStatus } from "@sam-monorepo/database/client";
import { IDENTITY_LOG_TYPES } from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { getReadableCitizenLogWhere } from "./readableCitizenLogWhere.js";

export const listCitizenLogHistoryInputSchema = z.object({
  type: z.enum(IDENTITY_LOG_TYPES),
  citizen_id: idSchema,
});

export type ListCitizenLogHistoryInput = z.infer<
  typeof listCitizenLogHistoryInputSchema
>;

interface AuthorName {
  readonly name: string | null;
}

export interface CitizenLogHistoryEntry {
  readonly id: string;
  readonly citizenId: string;
  readonly type: string;
  readonly content: string | null;
  readonly createdAt: Date;
  readonly confirmed: ConfirmationStatus | null;
  readonly confirmedBy: AuthorName | null;
  readonly submittedBy: AuthorName | null;
}

/** The same visibility as the Spynet log tables */
export const listCitizenLogHistory = async (
  context: ApplicationContext,
  actor: Actor,
  input: ListCitizenLogHistoryInput,
): Promise<CitizenLogHistoryEntry[]> => {
  const readableWhere = await getReadableCitizenLogWhere(context, actor, [
    input.type,
  ]);

  return context.prisma.citizenLog.findMany({
    where: { AND: [{ citizenId: input.citizen_id }, readableWhere] },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      citizenId: true,
      type: true,
      content: true,
      createdAt: true,
      confirmed: true,
      confirmedBy: { select: { name: true } },
      submittedBy: { select: { name: true } },
    },
  });
};
