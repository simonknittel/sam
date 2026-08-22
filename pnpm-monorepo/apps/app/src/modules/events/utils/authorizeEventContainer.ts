import { prisma } from "@/db";
import { getEventTemplateById } from "@/modules/event-templates/queries/getEventTemplateById";
import type { getTranslations } from "next-intl/server";
import { EventContainerKind, type EventContainer } from "./eventContainer";
import { isAllowedToManagePositions } from "./isAllowedToManagePositions";
import { isEventUpdatable } from "./isEventUpdatable";

export type EventContainerAuthorization =
  | { readonly allowed: true; readonly error?: never }
  | { readonly allowed: false; readonly error: string };

interface Options {
  /**
   * Skips the "the event is over" check. Set when the container is only read
   * from — copying a position out of an event that already happened is the
   * whole point of pasting it into the next one.
   */
  readonly ignoreFreeze?: boolean;
}

/**
 * The single authorization seam of every lineup mutation. Events keep the
 * guards they always had — the event must exist, must not be over, and the
 * user must be allowed to manage its positions. Templates use their own ACL
 * instead: edit access on a template that is not soft-deleted. Templates
 * never freeze, because they have no schedule to be over.
 */
export const authorizeEventContainer = async (
  container: EventContainer,
  t: Awaited<ReturnType<typeof getTranslations>>,
  options: Options = {},
): Promise<EventContainerAuthorization> => {
  switch (container.kind) {
    case EventContainerKind.Event: {
      const event = await prisma.event.findUnique({
        where: { id: container.id },
        select: {
          startTime: true,
          endTime: true,
          discordCreatorId: true,
          createdById: true,
          managers: { select: { id: true } },
        },
      });
      if (!event) return { allowed: false, error: "Event nicht gefunden" };
      if (!options.ignoreFreeze && !isEventUpdatable(event))
        return { allowed: false, error: "Das Event ist bereits vorbei." };
      if (!(await isAllowedToManagePositions(event)))
        return { allowed: false, error: t("Common.forbidden") };

      return { allowed: true };
    }

    case EventContainerKind.Template: {
      const context = await getEventTemplateById(container.id);
      if (!context) return { allowed: false, error: "Vorlage nicht gefunden" };
      if (context.template.deletedAt !== null)
        return { allowed: false, error: "Die Vorlage ist gelöscht." };
      if (!context.permissions.canEdit)
        return { allowed: false, error: t("Common.forbidden") };

      return { allowed: true };
    }

    default:
      throw new Error(
        `Unknown lineup container kind: ${container.kind satisfies never}`,
      );
  }
};
