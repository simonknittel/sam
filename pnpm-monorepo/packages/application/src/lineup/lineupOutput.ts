import type {
  Citizen,
  Event,
  Prisma,
  Variant,
} from "@sam-monorepo/database/client";
import {
  toCitizenReference,
  toCitizenReferences,
  type CitizenReference,
} from "../citizenReference.js";
import type { ApplicationContext } from "../context.js";
import { isEventUpdatable } from "../events/eventManageRules.js";
import { POSITION_TREE_INCLUDE } from "./positionTreeInclude.js";

export interface LineupPosition {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  /** The ship variants of the position, in their order */
  readonly required_variants: { readonly id: string; readonly name: string }[];
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

/** One level of the position tree, as `POSITION_TREE_INCLUDE` loads it */
interface PositionTreeRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly requiredVariants: readonly {
    readonly variant: Pick<Variant, "id" | "name">;
  }[];
  readonly citizen: PositionCitizen | null;
  readonly applications: readonly { readonly citizen: PositionCitizen }[];
  /** Missing on the deepest level */
  readonly childPositions?: readonly PositionTreeRow[];
}

const toLineupPosition = (
  position: PositionTreeRow,
  canManagePositions: boolean,
): LineupPosition => ({
  id: position.id,
  name: position.name,
  description: position.description,
  required_variants: position.requiredVariants.map(({ variant }) => ({
    id: variant.id,
    name: variant.name,
  })),
  assignee: toCitizenReference(position.citizen),
  applications: canManagePositions
    ? toCitizenReferences(
        position.applications.map((application) => application.citizen),
      )
    : [],
  children: (position.childPositions ?? []).map((childPosition) =>
    toLineupPosition(childPosition, canManagePositions),
  ),
});

/**
 * The lineup of an event as the output of the use cases. Carries no
 * permission check: the caller checks the event first.
 */
export const toEventLineupOutput = async (
  context: ApplicationContext,
  event: Pick<Event, "id" | "name" | "startTime" | "endTime">,
  canManagePositions: boolean,
): Promise<GetEventLineupOutput> => {
  const positions = await findEventPositionTree(context, event.id);

  return {
    event: { id: event.id, name: event.name },
    can_manage_positions: canManagePositions,
    is_updatable: isEventUpdatable(event, context.now()),
    positions: positions.map((position) =>
      toLineupPosition(position, canManagePositions),
    ),
  };
};

/**
 * One position with its children, as the output of the use cases. Carries
 * no permission check: the caller checks the position first.
 */
export const toLineupPositionOutput = async (
  context: ApplicationContext,
  positionId: string,
  canManagePositions: boolean,
): Promise<LineupPosition> =>
  toLineupPosition(
    await context.prisma.eventPosition.findUniqueOrThrow({
      where: { id: positionId },
      include: POSITION_TREE_INCLUDE,
    }),
    canManagePositions,
  );

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
