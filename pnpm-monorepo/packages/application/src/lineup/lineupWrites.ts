import type {
  EventPosition,
  EventPositionRoleMatch,
  Prisma,
} from "@sam-monorepo/database/client";
import {
  getEventContainerOfRow,
  getPositionLevels,
  LINEUP_MAX_DEPTH,
  LINEUP_MAX_POSITIONS,
  LINEUP_MAX_POSITIONS_PER_LEVEL,
  type EventContainerColumns,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  ConflictError,
  NotFoundError,
  rethrowRecordNotFound,
  ValidationError,
} from "../errors.js";
import { isRoleVisible, requireVisibleRoles } from "../roles/roleVisibility.js";
import { LineupErrorMessage } from "./lineupErrors.js";
import {
  toStoredFontSize,
  type NewPositionFields,
  type PositionChange,
} from "./positionFields.js";

/*
 * The writes of the positions that the lineup of an event and the lineup of
 * an event template share. They are internal and carry no permission check:
 * each use case checks the container first.
 */

/** What the use cases read of a position before they change or copy it */
export const LINEUP_POSITION_SELECT = {
  id: true,
  name: true,
  eventId: true,
  templateId: true,
  citizenId: true,
  order: true,
  parentPositionId: true,
  fontSize: true,
  backgroundColor: true,
  textColor: true,
} as const satisfies Prisma.EventPositionSelect;

/**
 * A position of a lineup with its container. Carries no permission check:
 * the caller checks the container.
 *
 * @throws NotFoundError when the position does not exist
 */
export const findLineupPosition = async (
  context: ApplicationContext,
  positionId: string,
) => {
  const position = await context.prisma.eventPosition.findUnique({
    where: { id: positionId },
    select: LINEUP_POSITION_SELECT,
  });

  const container = position ? getEventContainerOfRow(position) : null;
  if (!position || !container)
    throw new NotFoundError(LineupErrorMessage.PositionNotFound);

  return { position, container };
};

/**
 * The database permits each variant one time for each position, thus the
 * repeated variants are removed. A variant that does not exist is an error
 * of the input.
 */
const requireVariants = async (
  context: ApplicationContext,
  variantIds: readonly string[],
) => {
  const uniqueVariantIds = Array.from(new Set(variantIds));
  if (uniqueVariantIds.length === 0) return uniqueVariantIds;

  const variantCount = await context.prisma.variant.count({
    where: { id: { in: uniqueVariantIds } },
  });
  if (variantCount !== uniqueVariantIds.length)
    throw new ValidationError(LineupErrorMessage.VariantNotFound);

  return uniqueVariantIds;
};

const toRequiredVariantRows = (variantIds: readonly string[]) =>
  variantIds.map((variantId, index) => ({ variantId, order: index }));

/**
 * The actor can require only the roles of the role picker: the roles that
 * exist and that the actor can see
 */
const requireNewRequiredRoles = async (
  context: ApplicationContext,
  actor: Actor,
  roleIds: readonly string[],
) => {
  await requireVisibleRoles(
    context,
    actor,
    roleIds,
    LineupErrorMessage.RoleNotFound,
  );

  return Array.from(new Set(roleIds));
};

/**
 * The new required roles of a position. The actor gives only the roles that
 * the actor can see, thus the roles that the actor cannot see stay.
 */
const resolveRequiredRoleChange = async (
  context: ApplicationContext,
  actor: Actor,
  positionId: string,
  roleIds: readonly string[],
) => {
  const currentRoleIds = (
    await context.prisma.eventPositionRequiredRole.findMany({
      where: { positionId },
      select: { roleId: true },
    })
  ).map(({ roleId }) => roleId);

  const addedRoleIds = await requireNewRequiredRoles(
    context,
    actor,
    roleIds.filter((roleId) => !currentRoleIds.includes(roleId)),
  );
  const keptRoleIds = currentRoleIds.filter(
    (roleId) => roleIds.includes(roleId) || !isRoleVisible(actor, roleId),
  );

  return [...keptRoleIds, ...addedRoleIds];
};

const toRequiredRoleRows = (roleIds: readonly string[]) =>
  roleIds.map((roleId) => ({ roleId }));

interface ContainerPosition {
  readonly id: string;
  readonly parentPositionId: string | null;
}

/**
 * The parent must be in the same container, or the position would go into a
 * different lineup: the tree uses only `parentPositionId`. A missing parent
 * is usually a parent that a different tab deleted. A parent on the last
 * level cannot get children.
 */
const requireParentPosition = (
  containerPositions: readonly ContainerPosition[],
  parentPositionId: string,
) => {
  const parentLevel =
    getPositionLevels(containerPositions).get(parentPositionId);
  if (parentLevel === undefined)
    throw new NotFoundError(LineupErrorMessage.PositionNotFound);

  if (parentLevel >= LINEUP_MAX_DEPTH)
    throw new ValidationError(LineupErrorMessage.LineupTooDeep);
};

/**
 * The limits of a new order (see `lineupOrderSchema`) also apply to a new
 * position, else the lineup could not get a new order anymore
 */
const requireRoomForPosition = (
  containerPositions: readonly ContainerPosition[],
  parentPositionId: string | null,
) => {
  if (containerPositions.length >= LINEUP_MAX_POSITIONS)
    throw new ConflictError(LineupErrorMessage.TooManyPositions);

  const siblingCount = containerPositions.filter(
    (position) => position.parentPositionId === parentPositionId,
  ).length;
  if (siblingCount >= LINEUP_MAX_POSITIONS_PER_LEVEL)
    throw new ConflictError(LineupErrorMessage.TooManyPositionsOnLevel);
};

/** The data of the audit event of a new position, without its container */
export interface CreatedLineupPosition {
  readonly positionId: string;
  readonly name: string;
  readonly variantIds: string[];
  readonly roleIds: string[];
  readonly roleMatch: EventPositionRoleMatch;
  readonly parentPositionId?: string;
}

/** Adds the position as the last position of its parent */
export const insertLineupPosition = async (
  context: ApplicationContext,
  actor: Actor,
  container: EventContainerColumns,
  fields: NewPositionFields,
): Promise<CreatedLineupPosition> => {
  const containerPositions = await context.prisma.eventPosition.findMany({
    where: container,
    select: { id: true, parentPositionId: true },
  });
  const parentPositionId = fields.parent_position_id ?? null;
  if (parentPositionId !== null)
    requireParentPosition(containerPositions, parentPositionId);
  requireRoomForPosition(containerPositions, parentPositionId);

  const variantIds = await requireVariants(
    context,
    fields.required_variant_ids,
  );
  const roleIds = await requireNewRequiredRoles(
    context,
    actor,
    fields.required_role_ids,
  );

  const createdPosition = await context.prisma.eventPosition.create({
    data: {
      ...container,
      name: fields.name,
      description: fields.description,
      fontSize: toStoredFontSize(fields.font_size),
      backgroundColor: fields.background_color,
      textColor: fields.text_color,
      /**
       * The number of positions in the container is at least as large as
       * the order of each sibling
       */
      order: containerPositions.length,
      requiredVariants: {
        createMany: { data: toRequiredVariantRows(variantIds) },
      },
      requiredRoles: {
        createMany: { data: toRequiredRoleRows(roleIds) },
      },
      requiredRoleMatch: fields.required_role_match,
      parentPositionId,
    },
    select: { id: true },
  });

  return {
    positionId: createdPosition.id,
    name: fields.name,
    variantIds,
    roleIds,
    roleMatch: fields.required_role_match,
    parentPositionId: fields.parent_position_id,
  };
};

/** The data of the audit event of a changed position, without its container */
export interface UpdatedLineupPosition {
  readonly positionId: string;
  readonly previousName: string;
  readonly newName: string;
  readonly previousFontSize: string | null;
  readonly newFontSize: string | null;
  readonly previousBackgroundColor: string | null;
  readonly newBackgroundColor: string | null;
  readonly previousTextColor: string | null;
  readonly newTextColor: string | null;
}

/** A field of the change that is not given keeps the current value */
const changedValue = <Value>(change: Value | undefined, current: Value) =>
  change === undefined ? current : change;

/**
 * @throws NotFoundError when a different request deleted the position after
 * the guard read it
 */
export const writeLineupPositionChange = async (
  context: ApplicationContext,
  actor: Actor,
  position: Pick<
    EventPosition,
    "id" | "name" | "fontSize" | "backgroundColor" | "textColor"
  >,
  change: PositionChange,
): Promise<UpdatedLineupPosition> => {
  const fields = {
    name: change.name,
    description: change.description,
    fontSize: toStoredFontSize(change.font_size),
    backgroundColor: change.background_color,
    textColor: change.text_color,
    requiredRoleMatch: change.required_role_match,
  };

  const variantIds = change.required_variant_ids
    ? await requireVariants(context, change.required_variant_ids)
    : null;
  const roleIds = change.required_role_ids
    ? await resolveRequiredRoleChange(
        context,
        actor,
        position.id,
        change.required_role_ids,
      )
    : null;

  await rethrowRecordNotFound(async () => {
    await context.prisma.$transaction([
      ...(variantIds
        ? [
            context.prisma.eventPositionRequiredVariant.deleteMany({
              where: { positionId: position.id },
            }),
          ]
        : []),
      ...(roleIds
        ? [
            context.prisma.eventPositionRequiredRole.deleteMany({
              where: { positionId: position.id },
            }),
          ]
        : []),
      context.prisma.eventPosition.update({
        where: { id: position.id },
        data: {
          ...fields,
          ...(variantIds && {
            requiredVariants: {
              createMany: { data: toRequiredVariantRows(variantIds) },
            },
          }),
          ...(roleIds && {
            requiredRoles: {
              createMany: { data: toRequiredRoleRows(roleIds) },
            },
          }),
        },
      }),
    ]);
  }, LineupErrorMessage.PositionNotFound);

  return {
    positionId: position.id,
    previousName: position.name,
    newName: changedValue(change.name, position.name),
    previousFontSize: position.fontSize || null,
    newFontSize: changedValue(fields.fontSize, position.fontSize) || null,
    previousBackgroundColor: position.backgroundColor || null,
    newBackgroundColor:
      changedValue(change.background_color, position.backgroundColor) || null,
    previousTextColor: position.textColor || null,
    newTextColor: changedValue(change.text_color, position.textColor) || null,
  };
};

/**
 * Deletes the position. Its children go with it (a cascade of the database).
 *
 * @throws NotFoundError when a different request deleted the position after
 * the guard read it
 */
export const removeLineupPosition = async (
  context: ApplicationContext,
  positionId: string,
) => {
  await rethrowRecordNotFound(
    () => context.prisma.eventPosition.delete({ where: { id: positionId } }),
    LineupErrorMessage.PositionNotFound,
  );
};
