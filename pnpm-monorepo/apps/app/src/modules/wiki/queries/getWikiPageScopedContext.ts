import { prisma } from "@/db";
import {
  getBriefingPath,
  getWikiPageContainer,
} from "@/modules/events/utils/eventContainer";
import { WikiPageNamespace } from "@sam-monorepo/database/client";
import { revalidatePath } from "next/cache";
import { WikiScope } from "../utils/wikiPageHref";
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
 * server action serve the global wiki, the event briefings and the briefing
 * blueprints of event templates. An unknown page id resolves to the global
 * context, whose lookups then produce the action's usual not-found handling.
 * Returns null when the viewer cannot hold the page's context
 * (unauthenticated, missing `event;read` for an event page, or no access to
 * the template). Caller contract: answer null with the SAME error the action
 * uses for a page missing from the context — that keeps an existing but
 * inaccessible page indistinguishable from an unknown id.
 */
export const getWikiPageScopedContext = async (
  pageId: string,
): Promise<WikiPageScopedContext | null> => {
  const record = await prisma.wikiPage.findUnique({
    where: { id: pageId },
    select: { namespace: true, eventId: true, templateId: true },
  });
  if (!record) {
    const context = await getWikiContext();
    return context ? { scope: WikiScope.Wiki, context } : null;
  }

  switch (record.namespace) {
    case WikiPageNamespace.EVENT: {
      /** The CHECK constraint guarantees one container on EVENT rows */
      const container = getWikiPageContainer(record);
      if (!container) return null;
      const context = await getEventWikiContext(container);
      return context ? { scope: WikiScope.Event, context } : null;
    }

    case WikiPageNamespace.WIKI: {
      const context = await getWikiContext();
      return context ? { scope: WikiScope.Wiki, context } : null;
    }

    default:
      throw new Error(
        `Unknown wiki page namespace: ${record.namespace satisfies never}`,
      );
  }
};

/** Layout path a mutation in this scope must revalidate */
export const getWikiScopeRevalidationPath = (scoped: WikiPageScopedContext) => {
  switch (scoped.scope) {
    case WikiScope.Event:
      return getBriefingPath(scoped.context.container);

    case WikiScope.Wiki:
      return "/app/wiki";

    default:
      throw new Error(`Unknown wiki scope: ${scoped satisfies never}`);
  }
};

/**
 * The revalidations a WIKI-namespace mutation requires. Any WIKI page can
 * additionally be embedded on fleet variant pages — also deep inside a
 * linked subtree, and shared between variants — so this blanket-purges all
 * variant detail layouts instead of tracking which variants link one of the
 * page's ancestors: the pages are auth-dynamic, making revalidation a cheap
 * client-router-cache purge.
 */
export const revalidateGlobalWikiScope = () => {
  revalidatePath("/app/wiki", "layout");
  revalidatePath("/app/fleet/variant/[variantId]", "layout");
};

/** Performs the cache revalidations a mutation in this scope requires */
export const revalidateWikiScope = (scoped: WikiPageScopedContext) => {
  switch (scoped.scope) {
    case WikiScope.Event:
      revalidatePath(getBriefingPath(scoped.context.container), "layout");
      break;

    case WikiScope.Wiki:
      revalidateGlobalWikiScope();
      break;

    default:
      throw new Error(`Unknown wiki scope: ${scoped satisfies never}`);
  }
};

/**
 * Whether the scope rejects mutations: an event briefing freezes entirely
 * once its event is over. A template blueprint never freezes. Per-user
 * metadata (favourites, visits) stays writable.
 */
export const isWikiScopeFrozen = (scoped: WikiPageScopedContext) =>
  scoped.scope === WikiScope.Event && scoped.context.frozen;
