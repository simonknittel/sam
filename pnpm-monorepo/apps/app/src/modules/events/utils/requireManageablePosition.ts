import { prisma } from "@/db";
import type { EventPosition, Prisma } from "@sam-monorepo/database/client";
import type { getTranslations } from "next-intl/server";
import { isAllowedToManagePositions } from "./isAllowedToManagePositions";
import { isEventUpdatable } from "./isEventUpdatable";

type LoadedPosition = Prisma.EventPositionGetPayload<{
  include: {
    event: {
      include: {
        managers: true;
      };
    };
  };
}>;

/** The position of an event, as opposed to a template blueprint */
type PositionWithEvent = LoadedPosition & {
  event: NonNullable<LoadedPosition["event"]>;
};

type RequireManageablePositionResult =
  | { position: PositionWithEvent; failure?: never }
  | {
      position?: never;
      failure: { error: string; requestPayload: FormData };
    };

/**
 * The shared guard of the event position mutations: the position must exist
 * and belong to an event (not to a template), its event must still be
 * updatable, and the current user must be allowed to manage the event's
 * positions. Returns the position with its event, or the error response the
 * action should return as-is.
 */
export const requireManageablePosition = async (
  positionId: EventPosition["id"],
  formData: FormData,
  t: Awaited<ReturnType<typeof getTranslations>>,
): Promise<RequireManageablePositionResult> => {
  const position = await prisma.eventPosition.findUnique({
    where: {
      id: positionId,
    },
    include: {
      event: {
        include: {
          managers: true,
        },
      },
    },
  });

  const event = position?.event;
  if (!position || !event)
    return {
      failure: { error: "Posten nicht gefunden", requestPayload: formData },
    };

  if (!isEventUpdatable(event))
    return {
      failure: {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      },
    };

  if (!(await isAllowedToManagePositions(event)))
    return {
      failure: { error: t("Common.forbidden"), requestPayload: formData },
    };

  return { position: { ...position, event } };
};
