import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import {
  createWikiPageInputSchema,
  createWikiPageInScope,
} from "./createWikiPage.js";
import { findVariantWikiRootPageId } from "./variantWikiRedirect.js";
import {
  loadWikiScopeOfParent,
  requireWikiPagePlacement,
} from "./wikiPagePlacement.js";
import {
  buildWikiPageCopiedAuditEvents,
  copyWikiPageSubtree,
  requireWikiPageCopySource,
  WikiPageCopyDestinationKind,
} from "./wikiPageSubtreeCopy.js";

export const createWikiPageInTreeInputSchema = z.object({
  title: createWikiPageInputSchema.shape.title,
  /** Without it, the page goes to the top of the global wiki */
  parent_id: idSchema.optional(),
  /** A page that the actor can read: the new page starts as its copy */
  copy_from_page_id: idSchema.optional(),
  /** Copy the subtree of the copied page that the actor can read */
  copy_children: z.boolean(),
});

export type CreateWikiPageInTreeInput = z.infer<
  typeof createWikiPageInTreeInputSchema
>;

export interface CreateWikiPageInTreeOptions {
  /**
   * The fleet variant whose embed of the global wiki shows the form, for the
   * redirect into the embed
   */
  readonly variantId?: string;
}

export interface CreateWikiPageInTreeOutput {
  readonly page_id: string;
  readonly slug: string;
  readonly event_id: string | null;
  readonly template_id: string | null;
  /**
   * Only with the option `variantId`: the linked page of the variant when
   * the new page is in the embed of the variant, else null
   */
  readonly variant_wiki_page_id?: string | null;
}

/**
 * Creates a page in the page tree of the app: in the global wiki, in the
 * briefing of an event or in the briefing of an event template
 */
export const createWikiPageInTree = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateWikiPageInTreeInput,
  { variantId }: CreateWikiPageInTreeOptions = {},
): Promise<CreateWikiPageInTreeOutput> =>
  withSpan(context, "createWikiPageInTree", async () => {
    const citizen = requireCitizen(actor);
    const scope = requireWikiPagePlacement(
      actor,
      await loadWikiScopeOfParent(context, actor, input.parent_id),
      input.parent_id,
    );
    const parent =
      input.parent_id === undefined
        ? null
        : (scope.pagesById.get(input.parent_id) ?? null);
    const eventId = parent?.eventId ?? null;
    const templateId = parent?.templateId ?? null;

    let page: { readonly id: string; readonly slug: string };
    if (input.copy_from_page_id === undefined) {
      page = await createWikiPageInScope(
        context,
        actor,
        { title: input.title, parent_id: input.parent_id },
        scope,
      );
    } else {
      const { sourceScope, sourcePage } = await requireWikiPageCopySource(
        context,
        actor,
        input.copy_from_page_id,
      );
      const { root, copiedPages } = await copyWikiPageSubtree(context, {
        sourceScope,
        sourcePage,
        includeChildren: input.copy_children,
        targetScope: scope,
        destination: {
          kind: WikiPageCopyDestinationKind.NewPage,
          parentId: input.parent_id,
          rootTitle: input.title,
        },
        createdByEntityId: citizen.id,
      });

      await context.audit.create(
        buildWikiPageCopiedAuditEvents(
          copiedPages,
          root.id,
          eventId,
          actor.userId,
        ),
      );

      page = root;
    }

    return {
      page_id: page.id,
      slug: page.slug,
      event_id: eventId,
      template_id: templateId,
      ...(variantId === undefined
        ? {}
        : {
            variant_wiki_page_id: await findVariantWikiRootPageId(
              context,
              scope,
              variantId,
              page.id,
              input.parent_id ?? null,
            ),
          }),
    };
  });
