import { WikiPageNamespace } from "@sam-monorepo/database/client";
import {
  EventContainerKind,
  getEventContainerOfRow,
  WikiScopeKind,
  type EventContainer,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  buildEventWikiContext,
  hasReadableEventWikiRoot,
  type EventWikiContext,
} from "./eventWikiContext.js";
import {
  getAccessibleWikiPage,
  hasWikiPageTier,
  WikiPageAccessTier,
} from "./getAccessibleWikiPage.js";
import { buildTemplateWikiContext } from "./templateWikiContext.js";
import {
  buildVariantWikiContext,
  type VariantWikiContext,
} from "./variantWikiContext.js";
import {
  buildWikiContext,
  type WikiContext,
  type WikiSharedContextPage,
} from "./wikiContext.js";
import { WikiErrorMessage } from "./wikiErrors.js";

/**
 * The pages that a request works on, with the permissions of the actor and
 * the routes of the pages. The `kind` tells which scope it is. A request
 * loads its scope one time and gives it to the helpers that render the page.
 */
export type WikiScope = WikiContext | EventWikiContext | VariantWikiContext;

/** The scope that a page belongs to: variants are views of the global wiki */
export type WikiPageScope = WikiContext | EventWikiContext;

export type WikiScopeTarget =
  | { readonly kind: WikiScopeKind.Wiki }
  | {
      readonly kind: WikiScopeKind.Briefing;
      readonly container: EventContainer;
    }
  | { readonly kind: WikiScopeKind.Variant; readonly variantId: string };

export const buildBriefingWikiContext = (
  context: ApplicationContext,
  actor: Actor,
  container: EventContainer,
): Promise<EventWikiContext | null> => {
  switch (container.kind) {
    case EventContainerKind.Event:
      return buildEventWikiContext(context, actor, { event_id: container.id });

    case EventContainerKind.Template:
      return buildTemplateWikiContext(context, actor, container.id);

    default:
      throw new Error(
        `Unknown event container kind: ${container.kind satisfies never}`,
      );
  }
};

/**
 * The scope of a target that the caller knows only at runtime, for example
 * the input of a tRPC procedure. A caller with a fixed kind calls the
 * builder of the kind directly. Returns null when the actor cannot hold the
 * scope: a briefing without `event;read`, of an event that the actor cannot
 * see or of a template that the actor cannot read; a variant without the
 * fleet gate, without a linked page or with a linked page that the actor
 * cannot read. The global wiki is never null.
 */
const loadWikiScope = (
  context: ApplicationContext,
  actor: Actor,
  target: WikiScopeTarget,
): Promise<WikiScope | null> =>
  withSpan(context, "loadWikiScope", (): Promise<WikiScope | null> => {
    switch (target.kind) {
      case WikiScopeKind.Wiki:
        return buildWikiContext(context, actor);

      case WikiScopeKind.Briefing:
        return buildBriefingWikiContext(context, actor, target.container);

      case WikiScopeKind.Variant:
        return buildVariantWikiContext(context, actor, target.variantId);

      default:
        throw new Error(`Unknown wiki scope: ${target satisfies never}`);
    }
  });

/**
 * The scope of the page: the briefing of its event or event template, or
 * the global wiki. An unknown page id gives the global wiki, whose lookups
 * then give the not-found answer of the caller. Returns null when the actor
 * cannot hold the scope: the caller answers null with the same error as for
 * a page that is missing from the scope, thus an existing page that the
 * actor cannot see looks like an unknown id.
 */
export const loadWikiScopeOfPage = (
  context: ApplicationContext,
  actor: Actor,
  pageId: string,
): Promise<WikiPageScope | null> =>
  withSpan(context, "loadWikiScopeOfPage", async () => {
    const page = await context.prisma.wikiPage.findUnique({
      where: { id: pageId },
      select: { namespace: true, eventId: true, templateId: true },
    });
    if (!page) return buildWikiContext(context, actor);

    switch (page.namespace) {
      case WikiPageNamespace.EVENT: {
        /** The CHECK constraint guarantees one container on EVENT rows */
        const container = getEventContainerOfRow(page);
        if (!container) return null;

        return buildBriefingWikiContext(context, actor, container);
      }

      case WikiPageNamespace.WIKI:
        return buildWikiContext(context, actor);

      default:
        throw new Error(
          `Unknown wiki page namespace: ${page.namespace satisfies never}`,
        );
    }
  });

/**
 * A briefing without a root page that the actor can read does not exist for
 * the actor (see `hasReadableEventWikiRoot()`)
 */
export const isHiddenBriefing = (scope: WikiScope) =>
  scope.kind === WikiScopeKind.Briefing && !hasReadableEventWikiRoot(scope);

/**
 * `loadWikiScope()` with the gate of the briefing layout: the gate of the
 * reads that do not render a page of the briefing, for example the search
 * and the tags
 */
export const findReadableWikiScope = async (
  context: ApplicationContext,
  actor: Actor,
  target: WikiScopeTarget,
): Promise<WikiScope | null> => {
  const scope = await loadWikiScope(context, actor, target);
  if (!scope || isHiddenBriefing(scope)) return null;

  return scope;
};

/**
 * The scope input of the tRPC procedures of the app: the briefing of a
 * container, the embed of a variant, or the global wiki without both. A
 * procedure with more fields adds them with `safeExtend()`, which keeps the
 * check.
 */
export const wikiScopeInputSchema = z
  .object({
    container: z
      .object({
        kind: z.enum(EventContainerKind),
        /**
         * The ids are opaque. The limit keeps a hostile client from sending
         * megabytes.
         */
        id: z.string().min(1).max(64),
      })
      .optional(),
    variantId: idSchema.optional(),
  })
  .refine((input) => !(input.container && input.variantId), {
    message: "container and variantId are mutually exclusive",
  });

export const toWikiScopeTarget = ({
  container,
  variantId,
}: z.output<typeof wikiScopeInputSchema>): WikiScopeTarget => {
  if (container) return { kind: WikiScopeKind.Briefing, container };
  if (variantId) return { kind: WikiScopeKind.Variant, variantId };

  return { kind: WikiScopeKind.Wiki };
};

export const getWikiPageScopeContainer = (
  scope: WikiScope,
): EventContainer | null =>
  scope.kind === WikiScopeKind.Briefing ? scope.container : null;

/**
 * Whether the scope refuses all changes: the briefing of an event that is
 * over. The briefing of a template never freezes. Personal data (favorites,
 * visits) stays writable.
 */
export const isWikiScopeFrozen = (scope: WikiScope) =>
  scope.kind === WikiScopeKind.Briefing && scope.frozen;

export const requireAccessibleWikiPage = (
  scope: WikiScope,
  pageId: string,
  tier: WikiPageAccessTier,
): WikiSharedContextPage => {
  const page = getAccessibleWikiPage(scope, pageId, tier);
  if (!page) throw new NotFoundError(WikiErrorMessage.PageNotFound);

  return page;
};

interface WikiPageOfScopeOptions {
  readonly notFoundMessage?: WikiErrorMessage;
  readonly expectDeleted?: boolean;
}

const throwMissingWikiPageTier = (
  tier: WikiPageAccessTier,
  notFoundMessage: WikiErrorMessage,
): never => {
  switch (tier) {
    case WikiPageAccessTier.Read:
      throw new NotFoundError(notFoundMessage);

    case WikiPageAccessTier.Edit:
      throw new ForbiddenError("The user cannot edit the page");

    case WikiPageAccessTier.Admin:
      throw new ForbiddenError("The user does not manage the page");

    default:
      throw new Error(`Unknown wiki page access tier: ${tier satisfies never}`);
  }
};

/**
 * The guard of the operations on one page: loads the scope of the page and
 * checks the trash state and the tier of the actor. Gives the scope with the
 * page.
 *
 * @throws NotFoundError when the scope or the page does not exist for the
 * actor, when the page is not in the expected trash state (a different user
 * or tab changed the page before), or when the actor cannot read the page
 * for the read tier
 * @throws ForbiddenError when the actor does not hold the edit or the admin
 * tier
 */
export const requireWikiPageOfScope = async (
  context: ApplicationContext,
  actor: Actor,
  pageId: string,
  tier: WikiPageAccessTier,
  {
    notFoundMessage = WikiErrorMessage.PageNotFound,
    expectDeleted = false,
  }: WikiPageOfScopeOptions = {},
): Promise<{
  readonly scope: WikiPageScope;
  readonly page: WikiSharedContextPage;
}> => {
  const scope = await loadWikiScopeOfPage(context, actor, pageId);
  const page = scope?.pagesById.get(pageId);
  if (!scope || !page || (page.deletedAt !== null) !== expectDeleted)
    throw new NotFoundError(notFoundMessage);

  if (!hasWikiPageTier(scope.permissions.get(page.id), tier))
    throwMissingWikiPageTier(tier, notFoundMessage);

  return { scope, page };
};
