import {
  eventContainerColumns,
  EventContainerKind,
  type EventContainer,
  type EventContainerColumns,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireEditableEventTemplate } from "../eventTemplates/eventTemplateAccess.js";
import type { ManageableEventOptions } from "../events/eventManageGuard.js";
import { requireManageableEventLineup } from "./lineupGuards.js";

/** Templates never freeze */
export const requireEditableLineupContainer = async (
  context: ApplicationContext,
  actor: Actor,
  container: EventContainer,
  options: ManageableEventOptions = {},
): Promise<EventContainerColumns> => {
  switch (container.kind) {
    case EventContainerKind.Event:
      await requireManageableEventLineup(context, actor, container.id, options);
      break;

    case EventContainerKind.Template:
      await requireEditableEventTemplate(context, actor, container.id);
      break;

    default:
      throw new Error(
        `Unknown lineup container kind: ${container.kind satisfies never}`,
      );
  }

  return eventContainerColumns(container);
};
