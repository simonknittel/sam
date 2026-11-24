import { WikiPageNamespace } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  slugifyWikiPageTitle,
  WIKI_PAGE_CONTENT_JSON_MAXIMUM_LENGTH,
  WIKI_PAGE_TITLE_MAXIMUM_LENGTH,
  WikiScopeKind,
} from "@sam-monorepo/domain";
import { parseMarkdownToWikiContent } from "@sam-monorepo/wiki-editor/markdown";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { hasReadableEventWikiRoot } from "./eventWikiContext.js";
import { getWikiPage, type GetWikiPageOutput } from "./getWikiPage.js";
import { loadReadableWikiScope } from "./readableWikiScope.js";
import { DisallowedWikiIframesError, WikiErrorMessage } from "./wikiErrors.js";
import { findDisallowedWikiIframeSources } from "./wikiIframeAllowlist.js";
import {
  getNextWikiPageSortOrder,
  getTopLevelWikiPagePermissions,
  INHERITED_WIKI_PAGE_PERMISSIONS,
} from "./wikiPageDefaults.js";
import { requireWikiPagePlacement } from "./wikiPagePlacement.js";
import { requireCollab } from "./wikiPageSafetySnapshot.js";
import type { WikiPageScope } from "./wikiScope.js";

/**
 * About 3,000 words. The parser (marked) needs time that grows with the
 * square of the length for some texts: the worst case that was measured is
 * one paragraph with many `*` or `_` without a match, about 2.5 seconds for
 * 20,000 characters. A longer text could keep the server busy for much
 * longer.
 */
const MAX_MARKDOWN_LENGTH = 20_000;

export const createWikiPageInputSchema = z.object({
  title: z.string().trim().min(1).max(WIKI_PAGE_TITLE_MAXIMUM_LENGTH),
  parent_id: idSchema
    .optional()
    .describe(
      "The page below which the new page goes. The user must manage it. Without parent_id and event_id, the page goes to the top of the global wiki, where only the user can see it at first.",
    ),
  event_id: idSchema
    .optional()
    .describe(
      "The event whose briefing gets the page. Without parent_id, the page goes below the root page of the briefing.",
    ),
  markdown: z
    .string()
    .max(MAX_MARKDOWN_LENGTH)
    .optional()
    .describe(
      `The content as Markdown (CommonMark with the tables and the task lists of GitHub), at most ${MAX_MARKDOWN_LENGTH} characters. Without it, the page is empty.`,
    ),
});

export type CreateWikiPageInput = z.output<typeof createWikiPageInputSchema>;

export interface CreatedWikiPage {
  readonly id: string;
  readonly slug: string;
  readonly eventId: string | null;
  readonly templateId: string | null;
}

interface PreparedContent {
  readonly collab: NonNullable<ApplicationContext["collab"]>;
  readonly content: object;
}

/**
 * The checks run before the page exists, thus a refusal leaves no empty page
 * behind
 */
const prepareContent = (
  context: ApplicationContext,
  markdown: string,
): Promise<PreparedContent> =>
  withSpan(context, "prepareWikiPageContent", async () => {
    const collab = requireCollab(context);

    let content: object;
    try {
      content = parseMarkdownToWikiContent(markdown, {
        baseUrl: context.urls.baseUrl,
      });
    } catch (error) {
      throw new ValidationError(
        "The Markdown cannot become the content of a wiki page, for example because it is nested too deep",
        { cause: error },
      );
    }
    if (JSON.stringify(content).length > WIKI_PAGE_CONTENT_JSON_MAXIMUM_LENGTH)
      throw new ValidationError("The content is too large");

    const disallowedSources = await findDisallowedWikiIframeSources(
      context.prisma,
      content,
    );
    if (disallowedSources.length > 0)
      throw new DisallowedWikiIframesError(disallowedSources);

    return { collab, content };
  });

/**
 * Creates a page below the parent, or at the top of the global wiki without
 * a parent, in the scope that the caller loaded for the actor: the page tree
 * of the app also loads the briefings of the event templates, which the MCP
 * tools do not show (see `createWikiPageInTree()`). With Markdown, the
 * content goes through the collab server, thus open editors get it.
 *
 * Not a use case: only the use cases of this package call it.
 *
 * @param scope The scope of the parent (see `requireWikiPagePlacement()`)
 */
export const createWikiPageInScope = (
  context: ApplicationContext,
  actor: Actor,
  input: Omit<CreateWikiPageInput, "event_id">,
  scope: WikiPageScope | null,
): Promise<CreatedWikiPage> =>
  withSpan(context, "createWikiPageInScope", async () => {
    const citizen = requireCitizen(actor);
    const wiki = requireWikiPagePlacement(actor, scope, input.parent_id);
    const prepared =
      input.markdown === undefined
        ? null
        : await prepareContent(context, input.markdown);

    const parentId = input.parent_id ?? null;
    const parent = parentId === null ? null : wiki.pagesById.get(parentId);
    const eventId = parent?.eventId ?? null;
    const templateId = parent?.templateId ?? null;

    /**
     * A page below a parent inherits all tiers and the owner. The pages of a
     * briefing always have a parent: they inherit their scopes (the column
     * defaults) and have no owner, because the managers of the container
     * manage them.
     */
    const page = await context.prisma.wikiPage.create({
      data: {
        title: input.title,
        slug: slugifyWikiPageTitle(input.title),
        parentId,
        namespace:
          eventId || templateId
            ? WikiPageNamespace.EVENT
            : WikiPageNamespace.WIKI,
        eventId,
        templateId,
        sortOrder: getNextWikiPageSortOrder(wiki.pages, parentId),
        ...(parent
          ? { ...INHERITED_WIKI_PAGE_PERMISSIONS, ownerId: null }
          : getTopLevelWikiPagePermissions(citizen.id)),
        createdById: citizen.id,
      },
      select: { id: true, slug: true },
    });

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_CREATED,
        data: {
          pageId: page.id,
          eventId: eventId ?? undefined,
          title: input.title,
          parentId,
        },
        createdById: actor.userId,
      },
    ]);

    if (prepared) {
      try {
        await prepared.collab.replaceContent({
          pageId: page.id,
          content: prepared.content,
          updatedByEntityId: citizen.id,
        });
      } catch (error) {
        context.log.error(
          "The collab server did not take the content of a new wiki page",
          { pageId: page.id, error },
        );
        throw new ConflictError(
          `The page ${page.id} exists, but it is empty: the collab server did not take the content`,
          { cause: error },
        );
      }

      /**
       * Like the end of an editor session: the collab server writes no
       * audit event for a replacement
       */
      await context.audit.create([
        {
          type: AuditEventType.WIKI_PAGE_UPDATED,
          data: { pageId: page.id },
          createdById: actor.userId,
        },
      ]);
    }

    return { id: page.id, slug: page.slug, eventId, templateId };
  });

/**
 * The briefings of the event templates are not available, like for
 * `getWikiPage()`
 */
const loadEventIdOfParent = async (
  context: ApplicationContext,
  parentId: string,
  eventId: string | undefined,
): Promise<string | undefined> => {
  const parent = await context.prisma.wikiPage.findUnique({
    where: { id: parentId },
    select: { namespace: true, eventId: true },
  });
  if (
    !parent ||
    (parent.namespace === WikiPageNamespace.EVENT && !parent.eventId) ||
    (eventId !== undefined && parent.eventId !== eventId)
  )
    throw new NotFoundError(WikiErrorMessage.ParentPageNotFound);

  return parent.eventId ?? undefined;
};

/**
 * @throws ConflictError when the collab server is not configured (only with
 * Markdown)
 */
export const createWikiPage = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateWikiPageInput,
): Promise<GetWikiPageOutput> =>
  withSpan(context, "createWikiPage", async () => {
    const eventId =
      input.parent_id === undefined
        ? input.event_id
        : await loadEventIdOfParent(context, input.parent_id, input.event_id);
    const scope = await loadReadableWikiScope(context, actor, eventId);
    const parentId =
      input.parent_id ??
      (scope.kind === WikiScopeKind.Briefing && hasReadableEventWikiRoot(scope)
        ? scope.rootPage.id
        : undefined);

    const page = await createWikiPageInScope(
      context,
      actor,
      { title: input.title, parent_id: parentId, markdown: input.markdown },
      scope,
    );

    return getWikiPage(context, actor, { page_id: page.id });
  });
