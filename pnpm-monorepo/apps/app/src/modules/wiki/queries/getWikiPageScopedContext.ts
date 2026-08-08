import { prisma } from "@/db";
import { WikiPageNamespace } from "@sam-monorepo/database/client";
import { getEventWikiBasePath, WikiScope } from "../utils/wikiPageHref";
import {
  getEventWikiContext,
  type EventWikiContext,
} from "./getEventWikiContext";
import { getWikiContext, type WikiContext } from "./getWikiContext";

export type WikiPageScopedContext =
  | { readonly scope: WikiScope.Wiki; readonly context: WikiContext }
  | { readonly scope: WikiScope.Event; readonly context: EventWikiContext };

/**
 * Loads the context matching a page's namespace — the seam that lets one
 * server action serve both the global wiki and the event wikis. An unknown
 * page id resolves to the global context, whose lookups then produce the
 * action's usual not-found handling. Returns null when the viewer cannot
 * hold any context (unauthenticated, or missing `event;read` for an event
 * page — indistinguishable from an unknown page on purpose).
 */
export const getWikiPageScopedContext = async (
  pageId: string,
): Promise<WikiPageScopedContext | null> => {
  const record = await prisma.wikiPage.findUnique({
    where: { id: pageId },
    select: { namespace: true, eventId: true },
  });

  if (record?.namespace === WikiPageNamespace.EVENT && record.eventId) {
    const context = await getEventWikiContext(record.eventId);
    return context ? { scope: WikiScope.Event, context } : null;
  }

  const context = await getWikiContext();
  return context ? { scope: WikiScope.Wiki, context } : null;
};

/** Layout path a mutation in this scope must revalidate */
export const getWikiScopeRevalidationPath = (scoped: WikiPageScopedContext) =>
  scoped.scope === WikiScope.Event
    ? getEventWikiBasePath(scoped.context.event.id)
    : "/app/wiki";

/**
 * Whether the scope rejects mutations: an event wiki freezes entirely once
 * its event is over. Per-user metadata (favourites, visits) stays writable.
 */
export const isWikiScopeFrozen = (scoped: WikiPageScopedContext) =>
  scoped.scope === WikiScope.Event && scoped.context.frozen;
