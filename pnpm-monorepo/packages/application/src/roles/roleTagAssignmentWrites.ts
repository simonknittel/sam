import type { Prisma } from "@sam-monorepo/database/client";
import { AuditEventType, type AuditEventInput } from "@sam-monorepo/domain";
import { NotFoundError, ValidationError } from "../errors.js";
import { RoleErrorMessage, RoleTagErrorMessage } from "./roleErrors.js";

/** One link between a role and a tag */
export interface RoleTagPair {
  readonly roleId: string;
  readonly tagId: string;
}

/** The links that a write really added and removed */
export interface RoleTagAssignmentChanges {
  readonly added: RoleTagPair[];
  readonly removed: RoleTagPair[];
}

/** The add and remove lists of a write, see `toUniqueAssignmentIds()` */
interface UniqueAssignmentIds {
  readonly add: string[];
  readonly remove: string[];
}

const toPairKey = (pair: RoleTagPair) => `${pair.roleId}:${pair.tagId}`;

/**
 * The add and remove lists of a write without duplicates, in the order of
 * the input
 *
 * @throws ValidationError when an id is in both lists
 */
export const toUniqueAssignmentIds = (
  add: readonly string[],
  remove: readonly string[],
): UniqueAssignmentIds => {
  const uniqueAdd = [...new Set(add)];
  const uniqueRemove = [...new Set(remove)];

  const removals = new Set(uniqueRemove);
  if (uniqueAdd.some((id) => removals.has(id)))
    throw new ValidationError(RoleTagErrorMessage.AddedAndRemoved);

  return { add: uniqueAdd, remove: uniqueRemove };
};

/** @throws NotFoundError when a role does not exist */
export const requireRolesExist = async (
  transaction: Prisma.TransactionClient,
  roleIds: readonly string[],
) => {
  if (roleIds.length <= 0) return;

  const count = await transaction.role.count({
    where: { id: { in: [...roleIds] } },
  });
  if (count !== roleIds.length)
    throw new NotFoundError(RoleErrorMessage.NotFound);
};

/** @throws NotFoundError when a tag does not exist */
export const requireRoleTagsExist = async (
  transaction: Prisma.TransactionClient,
  tagIds: readonly string[],
) => {
  if (tagIds.length <= 0) return;

  const count = await transaction.roleTag.count({
    where: { id: { in: [...tagIds] } },
  });
  if (count !== tagIds.length)
    throw new NotFoundError(RoleTagErrorMessage.NotFound);
};

/**
 * Adds and removes links between roles and tags on the transaction of the
 * caller. The roles and the tags of `add` must exist. A link that exists
 * already stays, and a link that does not exist cannot be removed: thus the
 * result has only the links that really changed, in the order of the input.
 */
export const writeRoleTagAssignments = async (
  transaction: Prisma.TransactionClient,
  {
    add,
    remove,
    createdById,
  }: {
    readonly add: readonly RoleTagPair[];
    readonly remove: readonly RoleTagPair[];
    /** The citizen of the actor */
    readonly createdById: string | null;
  },
): Promise<RoleTagAssignmentChanges> => {
  const existingRemovals =
    remove.length > 0
      ? await transaction.roleTagAssignment.findMany({
          where: {
            OR: remove.map(({ roleId, tagId }) => ({ roleId, tagId })),
          },
          select: { id: true, roleId: true, tagId: true },
        })
      : [];
  if (existingRemovals.length > 0)
    await transaction.roleTagAssignment.deleteMany({
      where: {
        id: { in: existingRemovals.map((assignment) => assignment.id) },
      },
    });

  const createdAssignments =
    add.length > 0
      ? await transaction.roleTagAssignment.createManyAndReturn({
          data: add.map(({ roleId, tagId }) => ({
            roleId,
            tagId,
            createdById,
          })),
          // A different user can add the same link at the same time
          skipDuplicates: true,
          select: { roleId: true, tagId: true },
        })
      : [];

  const removedKeys = new Set(existingRemovals.map(toPairKey));
  const addedKeys = new Set(createdAssignments.map(toPairKey));

  return {
    added: add
      .filter((pair) => addedKeys.has(toPairKey(pair)))
      .map(({ roleId, tagId }) => ({ roleId, tagId })),
    removed: remove
      .filter((pair) => removedKeys.has(toPairKey(pair)))
      .map(({ roleId, tagId }) => ({ roleId, tagId })),
  };
};

/**
 * Adds tags to one role and removes tags from it on the transaction of the
 * caller (see `writeRoleTagAssignments()`)
 *
 * @throws NotFoundError when a tag to add does not exist
 */
export const writeTagsOfRole = async (
  transaction: Prisma.TransactionClient,
  {
    roleId,
    tagIds,
    createdById,
  }: {
    readonly roleId: string;
    readonly tagIds: UniqueAssignmentIds;
    /** The citizen of the actor */
    readonly createdById: string | null;
  },
): Promise<RoleTagAssignmentChanges> => {
  await requireRoleTagsExist(transaction, tagIds.add);

  return writeRoleTagAssignments(transaction, {
    add: tagIds.add.map((tagId) => ({ roleId, tagId })),
    remove: tagIds.remove.map((tagId) => ({ roleId, tagId })),
    createdById,
  });
};

/** The audit event of the changes, or nothing when no link changed */
export const toRoleTagAssignmentAuditEvents = (
  changes: RoleTagAssignmentChanges,
  userId: string,
): AuditEventInput[] =>
  changes.added.length > 0 || changes.removed.length > 0
    ? [
        {
          type: AuditEventType.ROLE_TAG_ASSIGNMENTS_UPDATED,
          data: { added: changes.added, removed: changes.removed },
          createdById: userId,
        },
      ]
    : [];
