import { getApplicationContext, getRequestActor } from "@/modules/application";
import type {
  EventContainer,
  EventContainerKind,
} from "@/modules/events/utils/eventContainer";
import {
  buildBriefingWikiContext,
  type EventWikiContext,
} from "@sam-monorepo/application";
import { cache } from "react";

export {
  hasReadableEventWikiRoot,
  type EventWikiContext,
  type EventWikiContextPage,
  type EventWikiContextPosition,
} from "@sam-monorepo/application";

/**
 * React `cache()` compares the arguments by identity, and each caller gives
 * a new container object. Thus the cache key is the kind and the id of the
 * container.
 */
const getBriefingScope = cache(async (kind: EventContainerKind, id: string) =>
  buildBriefingWikiContext(getApplicationContext(), await getRequestActor(), {
    kind,
    id,
  }),
);

/**
 * The briefing of a container with the permissions of the viewer, one time
 * for each request: the counterpart of `getWikiContext()` for one
 * container. The briefing tab, the tree and the page views use it. Returns
 * null when the viewer cannot hold it: without `event;read`, for an event
 * that the viewer cannot see, or for a template that the viewer cannot read
 * (see `buildBriefingWikiContext()`).
 */
export const getEventWikiContext = (
  container: EventContainer,
): Promise<EventWikiContext | null> =>
  getBriefingScope(container.kind, container.id);
