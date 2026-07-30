"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import {
  extractWikiPageText,
  getWikiEditorSchema,
} from "@sam-monorepo/wiki-editor";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { maybeCreateWikiAutoSnapshot } from "../utils/maybeCreateWikiAutoSnapshot";
import { syncWikiPageUploadLinks } from "../utils/syncWikiPageUploadLinks";

const schema = z.object({
  id: z.cuid2(),
  /** Tiptap JSON document, stringified */
  content: z.string().max(2_000_000),
  /**
   * Set on the first save of an editing session so exactly one audit event
   * is written per session instead of one per autosave.
   */
  firstSaveOfSession: z.coerce.boolean().optional(),
});

export const updateWikiPageContent = createAuthenticatedAction(
  "updateWikiPageContent",
  schema,
  async (formData, authentication, data, t) => {
    const context = await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canEdit)
      return { error: t("Common.forbidden"), requestPayload: formData };

    /**
     * Validate the document against the editor schema. This rejects unknown
     * node/mark types and invalid structures and normalizes the JSON.
     */
    let normalized: unknown;
    try {
      const parsed: unknown = JSON.parse(data.content);
      const documentNode = ProseMirrorNode.fromJSON(
        getWikiEditorSchema(),
        parsed,
      );
      documentNode.check();
      normalized = documentNode.toJSON();
    } catch {
      return { error: t("Common.badRequest"), requestPayload: formData };
    }

    /**
     * Before overwriting, preserve the stored state as an automatic
     * snapshot when the 30-minute cadence has passed.
     */
    await maybeCreateWikiAutoSnapshot(page.id);

    await prisma.wikiPage.update({
      where: { id: page.id },
      data: {
        content: normalized as object,
        searchText: extractWikiPageText(normalized).slice(0, 200_000),
        updatedById: authentication.session.entity?.id ?? null,
      },
    });

    await syncWikiPageUploadLinks(page.id, normalized);

    if (data.firstSaveOfSession) {
      await createAuditEvents([
        {
          type: AuditEventType.WIKI_PAGE_UPDATED,
          data: { pageId: page.id },
          createdById: authentication.session.user.id,
        },
      ]);
    }

    revalidatePath("/app/wiki", "layout");

    return { success: "Gespeichert." };
  },
);
