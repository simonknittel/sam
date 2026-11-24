import type { Prisma } from "@sam-monorepo/database/client";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError } from "../errors.js";
import {
  cursorSchema,
  idSchema,
  pageLimitSchema,
  paginateByDatabaseCursor,
  type PageOptions,
} from "../pagination.js";
import { buildActivePenaltyEntryWhere } from "./activePenaltyEntryWhere.js";
import {
  PENALTY_ENTRY_SELECT,
  toPenaltyEntryOutput,
  type PenaltyEntryOutput,
} from "./penaltyEntryOutput.js";

export enum PenaltyEntryStatus {
  Active = "active",
  Inactive = "inactive",
  NotDeleted = "not_deleted",
  Deleted = "deleted",
}

export const listPenaltyEntriesInputSchema = z.object({
  status: z
    .enum(PenaltyEntryStatus)
    .default(PenaltyEntryStatus.Active)
    .describe(
      "active: not expired and not deleted. inactive: expired and not deleted. not_deleted: active and inactive. deleted: only the deleted entries.",
    ),
  citizen_id: idSchema.optional().describe("Only the entries of this citizen."),
  limit: pageLimitSchema,
  cursor: cursorSchema.optional(),
});

export interface ListPenaltyEntriesOutput {
  readonly entries: PenaltyEntryOutput[];
  readonly next_cursor: string | null;
  readonly previous_cursor: string | null;
}

const buildStatusWhere = (
  status: PenaltyEntryStatus,
  now: Date,
): Prisma.PenaltyEntryWhereInput => {
  switch (status) {
    case PenaltyEntryStatus.Active:
      return buildActivePenaltyEntryWhere(now);

    case PenaltyEntryStatus.Inactive:
      return { deletedAt: null, expiresAt: { lt: now } };

    case PenaltyEntryStatus.NotDeleted:
      return { deletedAt: null };

    case PenaltyEntryStatus.Deleted:
      return { deletedAt: { not: null } };

    default:
      throw new Error(
        `Unknown penalty entry status: ${status satisfies never}`,
      );
  }
};

/**
 * Without `penaltyEntry;read`, a citizen can read only the own entries that are
 * not deleted: the app shows them on the penalty points tab of the citizen,
 * which also needs `citizen;read`
 */
const authorizeList = (
  actor: Actor,
  input: z.infer<typeof listPenaltyEntriesInputSchema>,
) => {
  if (actor.authorize("penaltyEntry", "read")) return;

  const isOwnCitizen =
    input.citizen_id !== undefined && input.citizen_id === actor.citizen?.id;

  if (
    !isOwnCitizen ||
    input.status === PenaltyEntryStatus.Deleted ||
    !actor.authorize("ownPenaltyEntry", "read") ||
    !actor.authorize("citizen", "read")
  )
    throw new ForbiddenError("The permission penaltyEntry;read is missing");
};

export const listPenaltyEntries = async (
  context: ApplicationContext,
  actor: Actor,
  input: z.infer<typeof listPenaltyEntriesInputSchema>,
  { direction, unknownCursor }: PageOptions = {},
): Promise<ListPenaltyEntriesOutput> => {
  authorizeList(actor, input);

  const where: Prisma.PenaltyEntryWhereInput = {
    ...buildStatusWhere(input.status, context.now()),
    ...(input.citizen_id ? { citizenId: input.citizen_id } : {}),
  };

  const page = await paginateByDatabaseCursor(
    {
      cursor: input.cursor,
      pageSize: input.limit,
      direction,
      unknownCursor,
    },
    (cursorArguments) =>
      context.prisma.penaltyEntry.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: PENALTY_ENTRY_SELECT,
        ...cursorArguments,
      }),
    async (id) =>
      (await context.prisma.penaltyEntry.count({ where: { id } })) > 0,
  );

  return {
    entries: page.items.map(toPenaltyEntryOutput),
    next_cursor: page.nextCursor,
    previous_cursor: page.previousCursor,
  };
};
