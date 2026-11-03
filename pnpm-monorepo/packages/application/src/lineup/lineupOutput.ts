import type {
  Citizen,
  Event,
  EventPositionRoleMatch,
  Prisma,
  Variant,
} from "@sam-monorepo/database/client";
import type { Actor } from "../actor.js";
import {
  toCitizenReference,
  toCitizenReferences,
  type CitizenReference,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { isEventUpdatable } from "../events/eventManageRules.js";
import { compareRoleNames, isRoleVisible } from "../roles/roleVisibility.js";
import { POSITION_TREE_INCLUDE } from "./positionTreeInclude.js";

export interface LineupPosition {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  /** The ship variants of the position, in their order */
  readonly required_variants: { readonly id: string; readonly name: string }[];
  /**
   * The required roles that the actor can see, sorted by name. The app shows
   * only these roles (see the role badges).
   */
  readonly required_roles: RoleReference[];
  readonly required_role_match: EventPositionRoleMatch;
  /** Null when nobody is assigned or the assigned citizen is deleted */
  readonly assignee: CitizenReference | null;
  /**
   * The citizens who applied for the position. Empty when the actor cannot
   * manage the positions: the lineup page shows the applicants only to them.
   */
  readonly applications: CitizenReference[];
  readonly children: LineupPosition[];
}

export interface GetEventLineupOutput {
  readonly event: { readonly id: string; readonly name: string };
  readonly can_manage_positions: boolean;
  /** False when the event has ended: then the lineup cannot change */
  readonly is_updatable: boolean;
  readonly positions: LineupPosition[];
}

export type EventPositionTreeRow = Prisma.EventPositionGetPayload<{
  include: typeof POSITION_TREE_INCLUDE;
}>;

/**
 * The root positions of the lineup of an event, with their children four
 * levels deep. Carries no permission check: the caller resolves the event
 * first.
 */
export const findEventPositionTree = (
  context: ApplicationContext,
  eventId: string,
): Promise<EventPositionTreeRow[]> =>
  context.prisma.eventPosition.findMany({
    where: { eventId, parentPositionId: null },
    orderBy: { order: "asc" },
    include: POSITION_TREE_INCLUDE,
  });

type PositionCitizen = Pick<Citizen, "id" | "handle" | "deletedAt">;

interface RoleReference {
  readonly id: string;
  readonly name: string;
}

/** One level of the position tree, as `POSITION_TREE_INCLUDE` loads it */
interface PositionTreeRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly requiredVariants: readonly {
    readonly variant: Pick<Variant, "id" | "name">;
  }[];
  readonly requiredRoles: readonly { readonly roleId: string }[];
  readonly requiredRoleMatch: EventPositionRoleMatch;
  readonly citizen: PositionCitizen | null;
  readonly applications: readonly { readonly citizen: PositionCitizen }[];
  /** Missing on the deepest level */
  readonly childPositions?: readonly PositionTreeRow[];
}

const collectRequiredRoleIds = (
  positions: readonly PositionTreeRow[],
): string[] =>
  positions.flatMap((position) => [
    ...position.requiredRoles.map(({ roleId }) => roleId),
    ...collectRequiredRoleIds(position.childPositions ?? []),
  ]);

/** The required roles of the positions that the actor can see, by id */
const findVisibleRequiredRoles = async (
  context: ApplicationContext,
  actor: Actor,
  positions: readonly PositionTreeRow[],
): Promise<Map<string, RoleReference>> => {
  const roleIds = new Set(
    collectRequiredRoleIds(positions).filter((roleId) =>
      isRoleVisible(actor, roleId),
    ),
  );
  if (roleIds.size <= 0) return new Map();

  const roles = await context.prisma.role.findMany({
    where: { id: { in: [...roleIds] } },
    select: { id: true, name: true },
  });

  return new Map(roles.map((role) => [role.id, role]));
};

const toLineupPosition = (
  position: PositionTreeRow,
  canManagePositions: boolean,
  visibleRoles: ReadonlyMap<string, RoleReference>,
): LineupPosition => ({
  id: position.id,
  name: position.name,
  description: position.description,
  required_variants: position.requiredVariants.map(({ variant }) => ({
    id: variant.id,
    name: variant.name,
  })),
  required_roles: position.requiredRoles
    .flatMap(({ roleId }) => visibleRoles.get(roleId) ?? [])
    .toSorted(compareRoleNames),
  required_role_match: position.requiredRoleMatch,
  assignee: toCitizenReference(position.citizen),
  applications: canManagePositions
    ? toCitizenReferences(
        position.applications.map((application) => application.citizen),
      )
    : [],
  children: (position.childPositions ?? []).map((childPosition) =>
    toLineupPosition(childPosition, canManagePositions, visibleRoles),
  ),
});

/**
 * The lineup of an event as the output of the use cases. Carries no
 * permission check: the caller checks the event first.
 */
export const toEventLineupOutput = async (
  context: ApplicationContext,
  actor: Actor,
  event: Pick<Event, "id" | "name" | "startTime" | "endTime">,
  canManagePositions: boolean,
): Promise<GetEventLineupOutput> => {
  const positions = await findEventPositionTree(context, event.id);
  const visibleRoles = await findVisibleRequiredRoles(
    context,
    actor,
    positions,
  );

  return {
    event: { id: event.id, name: event.name },
    can_manage_positions: canManagePositions,
    is_updatable: isEventUpdatable(event, context.now()),
    positions: positions.map((position) =>
      toLineupPosition(position, canManagePositions, visibleRoles),
    ),
  };
};

/**
 * One position with its children, as the output of the use cases. Carries
 * no permission check: the caller checks the position first.
 */
export const toLineupPositionOutput = async (
  context: ApplicationContext,
  actor: Actor,
  positionId: string,
  canManagePositions: boolean,
): Promise<LineupPosition> => {
  const position = await context.prisma.eventPosition.findUniqueOrThrow({
    where: { id: positionId },
    include: POSITION_TREE_INCLUDE,
  });

  return toLineupPosition(
    position,
    canManagePositions,
    await findVisibleRequiredRoles(context, actor, [position]),
  );
};

/**
 * The output of a write of one position that serves the lineups of the
 * events and of the event templates
 */
export interface LineupPositionWriteOutput {
  readonly position_id: string;
}

/** The output of a copy of positions into a lineup */
export interface LineupCopyOutput {
  /** The number of new positions, with the children */
  readonly position_count: number;
}
