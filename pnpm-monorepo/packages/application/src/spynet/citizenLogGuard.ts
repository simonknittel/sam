import type { Prisma } from "@sam-monorepo/database/client";
import { ACTIVE_CITIZEN_WHERE, type PermissionSet } from "@sam-monorepo/domain";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { CitizenLogErrorMessage } from "./citizenErrors.js";
import { getNotePermissionAttributes } from "./notePermissions.js";

/**
 * The write checks the decision again. The content is for the check of the own
 * Discord ID.
 */
export const CITIZEN_LOG_GUARD_SELECT = {
  id: true,
  type: true,
  citizenId: true,
  content: true,
  confirmed: true,
  noteTypeId: true,
  classificationLevelId: true,
} as const satisfies Prisma.CitizenLogSelect;

export type CitizenLogGuardRow = Prisma.CitizenLogGetPayload<{
  select: typeof CITIZEN_LOG_GUARD_SELECT;
}>;

/** The logs of a deleted citizen are read only */
export const requireActiveCitizenLog = async (
  context: Pick<ApplicationContext, "prisma">,
  logId: string,
): Promise<CitizenLogGuardRow> => {
  const log = await context.prisma.citizenLog.findFirst({
    where: { id: logId, citizen: ACTIVE_CITIZEN_WHERE },
    select: CITIZEN_LOG_GUARD_SELECT,
  });
  if (!log) throw new NotFoundError(CitizenLogErrorMessage.NotFound);

  return log;
};

/**
 * The log as the permission check saw it. A different user who moves the
 * note, or deletes the log or its citizen after the check, makes the write
 * with this filter fail. The caller adds the decision that it expects
 * (`confirmed`), thus a decision after the check also makes the write fail.
 */
export const getCheckedLogWhere = (
  log: Pick<CitizenLogGuardRow, "id" | "noteTypeId" | "classificationLevelId">,
) =>
  ({
    id: log.id,
    noteTypeId: log.noteTypeId,
    classificationLevelId: log.classificationLevelId,
    citizen: ACTIVE_CITIZEN_WHERE,
  }) satisfies Prisma.CitizenLogWhereInput;

export const authorizeCitizenLogOperation = (
  actor: Actor,
  log: CitizenLogGuardRow,
  operation: Extract<PermissionSet["operation"], "confirm" | "delete">,
) => {
  switch (log.type) {
    case "handle":
    case "teamspeak-id":
    case "discord-id":
    case "citizen-id":
    case "community-moniker":
      requirePermission(actor, log.type, operation);
      return;

    case "note":
      requirePermission(
        actor,
        "note",
        operation,
        getNotePermissionAttributes(log),
      );
      return;

    default:
      throw new ValidationError(CitizenLogErrorMessage.TypeNotSupported);
  }
};
