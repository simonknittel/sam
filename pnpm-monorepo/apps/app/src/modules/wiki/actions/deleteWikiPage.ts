"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import {
  getApplicationContext,
  mapApplicationErrorToActionResponse,
  toActor,
} from "@/modules/application";
import {
  deleteWikiPageInputSchema,
  deleteWikiPage as deleteWikiPageUseCase,
  idSchema,
  type DeleteWikiPageOutput,
} from "@sam-monorepo/application";
import {
  getBriefingPath,
  getEventContainerOfRow,
  getVariantWikiRootPath,
} from "@sam-monorepo/domain";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { WIKI_ERROR_TEXTS } from "../utils/wikiErrorTexts";
import { GLOBAL_WIKI_HREF_MODE } from "../utils/wikiPageHref";

const schema = deleteWikiPageInputSchema.extend({
  variant_id: idSchema.optional(),
});

/** Moves the page with its subtree into the trash */
export const deleteWikiPage = createAuthenticatedAction(
  "deleteWikiPage",
  schema,
  async (formData, authentication, data, t) => {
    const { variant_id: variantId, ...input } = data;

    let result: DeleteWikiPageOutput;
    try {
      result = await deleteWikiPageUseCase(
        getApplicationContext(),
        await toActor(authentication.session),
        input,
        { variantId },
      );
    } catch (error) {
      return mapApplicationErrorToActionResponse(error, {
        formData,
        t,
        texts: WIKI_ERROR_TEXTS,
      });
    }

    refresh();

    /**
     * A deletion inside the embed of a variant goes back to the variant. The
     * page is gone, thus the root of the embed, not the page.
     */
    if (variantId && result.variant_wiki_page_id)
      redirect(getVariantWikiRootPath(variantId));

    const container = getEventContainerOfRow({
      eventId: result.event_id,
      templateId: result.template_id,
    });
    redirect(
      container ? getBriefingPath(container) : GLOBAL_WIKI_HREF_MODE.basePath,
    );
  },
  {
    parseFormData: (formData) => ({
      page_id: formData.get("id"),
      variant_id: formData.get("variantId") || undefined,
    }),
  },
);
