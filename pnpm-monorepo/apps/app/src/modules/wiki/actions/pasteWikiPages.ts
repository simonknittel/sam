"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  isApplicationError,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  idSchema,
  pasteWikiPagesInputSchema,
  pasteWikiPages as pasteWikiPagesUseCase,
  type PasteWikiPagesOutput,
} from "@sam-monorepo/application";
import { getBriefingPath, getEventContainerOfRow } from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  WIKI_CLIPBOARD_COOKIE,
  WIKI_CLIPBOARD_COOKIE_PATH,
} from "../utils/wikiClipboardCookie";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";
import {
  buildWikiPageHref,
  createVariantWikiHrefMode,
  getWikiPageRouteHref,
} from "../utils/wikiPageHref";

const schema = pasteWikiPagesInputSchema.extend({
  variant_id: idSchema.optional(),
});

const getPastedPageHref = (
  result: PasteWikiPagesOutput,
  variantId: string | undefined,
) => {
  const page = { id: result.page_id, slug: result.slug };
  const container = getEventContainerOfRow({
    eventId: result.event_id,
    templateId: result.template_id,
  });

  /** The route of the root page of a briefing is the route of the briefing */
  if (result.is_briefing_root && container) return getBriefingPath(container);

  if (variantId && result.variant_wiki_page_id)
    return buildWikiPageHref(
      createVariantWikiHrefMode(variantId, result.variant_wiki_page_id),
      page,
    );

  return getWikiPageRouteHref({
    ...page,
    eventId: result.event_id,
    templateId: result.template_id,
  });
};

export const pasteWikiPages = createAuthenticatedAction(
  "pasteWikiPages",
  schema,
  async (formData, authentication, data, t) => {
    const { variant_id: variantId, ...input } = data;

    let result: PasteWikiPagesOutput;
    try {
      result = await pasteWikiPagesUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        input,
        {
          copyTitleSuffix: " (Kopie)",
          safetySnapshotName: "Automatische Sicherung vor Ersetzen",
          variantId,
        },
      );
    } catch (error) {
      /**
       * An unexpected error can come after the safety snapshot or after the
       * replace of the content: the page then shows the current state
       */
      if (!isApplicationError(error)) refresh();

      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: WIKI_ERROR_TEXTS,
      });
    }

    refresh();

    /** The paste uses up the clipboard: one copy, one paste */
    const cookieStore = await cookies();
    cookieStore.delete({
      name: WIKI_CLIPBOARD_COOKIE,
      path: WIKI_CLIPBOARD_COOKIE_PATH,
    });

    redirect(getPastedPageHref(result, variantId));
  },
  {
    parseFormData: (formData) => ({
      source_page_id: formData.get("sourcePageId"),
      include_children: formData.get("includeChildren") === "1",
      /**
       * The parent in the mode Child (an empty value pastes at the top
       * level), the replaced page in the mode Replace
       */
      target_page_id: formData.get("parentId") || undefined,
      mode: formData.get("mode") ?? undefined,
      variant_id: formData.get("variantId") || undefined,
    }),
  },
);
