import { prisma } from "@/db";
import type { EventPosition, Prisma } from "@sam-monorepo/database/client";
import type { getTranslations } from "next-intl/server";
import { authorizeEventContainer } from "./authorizeEventContainer";
import { getPositionContainer, type EventContainer } from "./eventContainer";
import { isAllowedToManagePositions } from "./isAllowedToManagePositions";
import { isEventUpdatable } from "./isEventUpdatable";

const POSITION_SELECT = {
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
} satisfies Prisma.EventPositionSelect;

export type ManageablePosition = Prisma.EventPositionGetPayload<{
  select: typeof POSITION_SELECT;
}>;

interface Failure {
  error: string;
  requestPayload: FormData;
}

type RequireManageablePositionResult =
  | {
      position: ManageablePosition;
      container: EventContainer;
      failure?: never;
    }
  | { position?: never; container?: never; failure: Failure };

/**
 * The shared guard of the lineup mutations: the position must exist and the
 * current user must be allowed to edit the container it belongs to (see
 * `authorizeEventContainer`). Returns the position with its container, or
 * the error response the action should return as-is.
 */
export const requireManageablePosition = async (
  positionId: EventPosition["id"],
  formData: FormData,
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<RequireManageablePositionResult> => {
  const position = await prisma.eventPosition.findUnique({
    where: { id: positionId },
    select: POSITION_SELECT,
  });

  const container = position ? getPositionContainer(position) : null;
  if (!position || !container)
    return {
      failure: { error: "Posten nicht gefunden", requestPayload: formData },
    };

  const authorization = await authorizeEventContainer(container, t);
  if (!authorization.allowed)
    return {
      failure: { error: authorization.error, requestPayload: formData },
    };

  return { position, container };
};

type RequireManageableEventPositionResult =
  | {
      position: ManageablePosition;
      eventId: string;
      failure?: never;
    }
  | { position?: never; eventId?: never; failure: Failure };

/**
 * The guard of the mutations that only make sense on a real event: assigning
 * and unassigning a citizen. Template blueprints are never staffed, so their
 * positions are rejected as not found — the same answer an unknown id gets.
 */
export const requireManageableEventPosition = async (
  positionId: EventPosition["id"],
  formData: FormData,
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<RequireManageableEventPositionResult> => {
  const position = await prisma.eventPosition.findUnique({
    where: { id: positionId },
    select: {
      ...POSITION_SELECT,
      event: {
        select: {
          startTime: true,
          endTime: true,
          discordCreatorId: true,
          createdById: true,
          managers: { select: { id: true } },
        },
      },
    },
  });

  const notFound: RequireManageableEventPositionResult = {
    failure: { error: "Posten nicht gefunden", requestPayload: formData },
  };
  if (!position?.eventId || !position.event) return notFound;

  if (!isEventUpdatable(position.event))
    return {
      failure: {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      },
    };

  if (!(await isAllowedToManagePositions(position.event)))
    return {
      failure: { error: t("Common.forbidden"), requestPayload: formData },
    };

  return { position, eventId: position.eventId };
};
