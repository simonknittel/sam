import {
  isEventWikiRootPage,
  WIKI_PAGE_TITLE_MAXIMUM_LENGTH,
  wikiContainerColumns,
  WikiPasteMode,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor, type ActorCitizen } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { findVariantWikiRootPageId } from "./variantWikiRedirect.js";
import { EMPTY_WIKI_DOCUMENT } from "./wikiContentNormalization.js";
import type { WikiSharedContextPage } from "./wikiContext.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import type { CopiedWikiPage } from "./wikiPageCopy.js";
import {
  loadWikiScopeOfParent,
  requireWikiPagePlacement,
} from "./wikiPagePlacement.js";
import {
  replaceWikiPageContentWithSafetySnapshot,
  requireCollab,
} from "./wikiPageSafetySnapshot.js";
import {
  buildWikiPageCopiedAuditEvents,
  copyWikiPageSubtree,
  requireWikiPageCopySource,
  WikiPageCopyDestinationKind,
} from "./wikiPageSubtreeCopy.js";
import { getWikiPageScopeContainer, type WikiPageScope } from "./wikiScope.js";
import { setWikiPageTags } from "./wikiTags.js";

export const pasteWikiPagesInputSchema = z.object({
  /** A page that the actor can read */
  source_page_id: idSchema,
  /**
   * In the mode Child, the parent of the copy: without it, the copy goes to
   * the top of the global wiki. In the mode Replace, the page that takes
   * over the copied page (necessary).
   */
  target_page_id: idSchema.optional(),
  /** Copy the subtree of the source that the actor can read */
  include_children: z.boolean(),
  mode: z.enum(WikiPasteMode).default(WikiPasteMode.Child),
});

export type PasteWikiPagesInput = z.infer<typeof pasteWikiPagesInputSchema>;

export interface PasteWikiPagesOptions {
  readonly copyTitleSuffix: string;
  readonly safetySnapshotName: string;
  /**
   * The fleet variant whose embed of the global wiki shows the form, for the
   * redirect into the embed
   */
  readonly variantId?: string;
}

export interface PasteWikiPagesOutput {
  /** The page to open: the new copy, or the replaced page */
  readonly page_id: string;
  readonly slug: string;
  readonly event_id: string | null;
  readonly template_id: string | null;
  readonly is_briefing_root: boolean;
  /** The new pages, and the replaced page in the mode Replace */
  readonly copied_page_count: number;
  /**
   * Only with the option `variantId`: the linked page of the variant when
   * the page to open is in the embed of the variant, else null
   */
  readonly variant_wiki_page_id?: string | null;
}

interface PasteResult {
  readonly root: { readonly id: string; readonly slug: string };
  /** One entry for each page that took over copied content */
  readonly copiedPages: CopiedWikiPage[];
  /** The parent of the root, for the redirect into the embed of a variant */
  readonly rootParentId: string | null;
}

interface ReplaceParameters {
  readonly sourceScope: WikiPageScope;
  readonly sourcePage: WikiSharedContextPage;
  readonly targetScope: WikiPageScope;
  readonly targetPage: WikiSharedContextPage;
  readonly includeChildren: boolean;
  readonly safetySnapshotName: string;
}

/**
 * The mode Replace: the target page keeps its identity (id, title,
 * permissions, parent, existing children) and takes over the content, the
 * icon, the tags and the sidebar mode of the copied page. The copied
 * children go after its existing children. The content goes through the
 * collab server, thus open editors get it, with a safety snapshot as the
 * undo path. The new child pages come last, thus a retry after a failure
 * cannot create pages two times.
 */
const replaceWikiPageWithCopy = async (
  context: ApplicationContext,
  citizen: ActorCitizen,
  {
    sourceScope,
    sourcePage,
    targetScope,
    targetPage,
    includeChildren,
    safetySnapshotName,
  }: ReplaceParameters,
): Promise<PasteResult> => {
  if (targetPage.id === sourcePage.id)
    throw new ValidationError(WikiErrorMessage.CannotReplaceWithItself);

  requireCollab(context);

  const [sourceRow, sourceTagAssignments] = await Promise.all([
    context.prisma.wikiPage.findUnique({
      where: { id: sourcePage.id },
      select: { content: true },
    }),
    context.prisma.wikiPageTag.findMany({
      where: { pageId: sourcePage.id },
      select: { tag: { select: { name: true } } },
    }),
  ]);
  if (!sourceRow) throw new NotFoundError(WikiErrorMessage.SourcePageNotFound);

  await replaceWikiPageContentWithSafetySnapshot(context, {
    pageId: targetPage.id,
    content: (sourceRow.content as object | null) ?? EMPTY_WIKI_DOCUMENT,
    updatedByEntityId: citizen.id,
    safetySnapshotName,
    failureMessage: WikiErrorMessage.ReplaceFailed,
  });

  await context.prisma.$transaction(async (transaction) => {
    await setWikiPageTags(transaction, {
      pageId: targetPage.id,
      names: sourceTagAssignments.map((assignment) => assignment.tag.name),
      container: getWikiPageScopeContainer(targetScope),
      createdById: citizen.id,
    });
    await transaction.wikiPage.update({
      where: { id: targetPage.id },
      data: {
        iconId: sourcePage.iconId,
        sidebarMode: sourcePage.sidebarMode,
        updatedById: citizen.id,
      },
      select: { id: true },
    });
  });

  const { root, copiedPages } = await copyWikiPageSubtree(context, {
    sourceScope,
    sourcePage,
    includeChildren,
    targetScope,
    destination: {
      kind: WikiPageCopyDestinationKind.IntoExistingPage,
      pageId: targetPage.id,
    },
    createdByEntityId: citizen.id,
  });

  return {
    root,
    copiedPages: [
      {
        id: targetPage.id,
        sourcePageId: sourcePage.id,
        title: targetPage.title,
        parentId: targetPage.parentId,
      },
      ...copiedPages,
    ],
    rootParentId: targetPage.parentId,
  };
};

/**
 * The clipboard holds only a reference, thus the source is read again with the
 * current permissions of the actor and the last saved content. A copy from the
 * briefing of an event that is over is possible (it is a read), a paste into
 * it is not. See `copyWikiPageSubtree()` for the rules of a copy across
 * scopes.
 *
 * The mode Child puts the copy below the target page. The mode Replace puts
 * the copy onto the target page itself (see `replaceWikiPageWithCopy()`): the
 * only way to move a whole briefing onto the locked root page of a different
 * briefing.
 */
export const pasteWikiPages = (
  context: ApplicationContext,
  actor: Actor,
  input: PasteWikiPagesInput,
  { copyTitleSuffix, safetySnapshotName, variantId }: PasteWikiPagesOptions,
): Promise<PasteWikiPagesOutput> =>
  withSpan(context, "pasteWikiPages", async () => {
    const citizen = requireCitizen(actor);

    const { sourceScope, sourcePage } = await requireWikiPageCopySource(
      context,
      actor,
      input.source_page_id,
    );

    if (
      input.mode === WikiPasteMode.Replace &&
      input.target_page_id === undefined
    )
      throw new ValidationError("The mode Replace needs a target page");

    const targetScope = requireWikiPagePlacement(
      actor,
      await loadWikiScopeOfParent(context, actor, input.target_page_id),
      input.target_page_id,
    );
    const targetColumns = wikiContainerColumns(
      getWikiPageScopeContainer(targetScope),
    );

    let result: PasteResult;
    let isBriefingRoot = false;
    switch (input.mode) {
      case WikiPasteMode.Child: {
        const rootTitle =
          sourcePage.title.slice(
            0,
            WIKI_PAGE_TITLE_MAXIMUM_LENGTH - copyTitleSuffix.length,
          ) + copyTitleSuffix;
        const { root, copiedPages } = await copyWikiPageSubtree(context, {
          sourceScope,
          sourcePage,
          includeChildren: input.include_children,
          targetScope,
          destination: {
            kind: WikiPageCopyDestinationKind.NewPage,
            parentId: input.target_page_id,
            rootTitle,
          },
          createdByEntityId: citizen.id,
        });
        result = {
          root,
          copiedPages,
          rootParentId: input.target_page_id ?? null,
        };
        break;
      }

      case WikiPasteMode.Replace: {
        const targetPage: WikiSharedContextPage | undefined =
          input.target_page_id === undefined
            ? undefined
            : targetScope.pagesById.get(input.target_page_id);
        /** The check of the placement guarantees the page */
        if (!targetPage) throw new Error("The target page is missing");

        result = await replaceWikiPageWithCopy(context, citizen, {
          sourceScope,
          sourcePage,
          targetScope,
          targetPage,
          includeChildren: input.include_children,
          safetySnapshotName,
        });
        isBriefingRoot = isEventWikiRootPage(targetPage);
        break;
      }

      default:
        throw new Error(
          `Unknown wiki paste mode: ${input.mode satisfies never}`,
        );
    }

    await context.audit.create(
      buildWikiPageCopiedAuditEvents(
        result.copiedPages,
        result.root.id,
        targetColumns.eventId,
        actor.userId,
        input.mode === WikiPasteMode.Replace ? result.root.id : undefined,
      ),
    );

    return {
      page_id: result.root.id,
      slug: result.root.slug,
      event_id: targetColumns.eventId,
      template_id: targetColumns.templateId,
      is_briefing_root: isBriefingRoot,
      copied_page_count: result.copiedPages.length,
      ...(variantId === undefined
        ? {}
        : {
            variant_wiki_page_id: await findVariantWikiRootPageId(
              context,
              targetScope,
              variantId,
              result.root.id,
              result.rootParentId,
            ),
          }),
    };
  });
