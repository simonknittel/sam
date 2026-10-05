"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { log } from "@/modules/logging";
import { getWikiEditorSchema } from "@sam-monorepo/wiki-editor";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import * as z from "zod";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
  rejectFrozenWikiScope,
} from "../queries/getWikiPageScopedContext";
import { createWikiPageSafetySnapshot } from "../utils/createWikiPageSafetySnapshot";
import { replaceWikiPageContent } from "../utils/replaceWikiPageContent";

const schema = z.object({
  snapshotId: z.cuid2(),
});

/**
 * Restores a snapshot as the page's current content (page admins only). A
 * safety snapshot of the pre-restore state is created first — it is the
 * undo path. The write goes through the shared replace path, so live collab
 * sessions converge on the restored content.
 */
export const restoreWikiPageSnapshot = createAuthenticatedAction(
  "restoreWikiPageSnapshot",
  schema,
  async (formData, authentication, data, t) => {
    const snapshot = await prisma.wikiPageSnapshot.findUnique({
      where: { id: data.snapshotId },
      select: { id: true, pageId: true, content: true },
    });
    if (!snapshot) {
      /**
       * The retention of the automatic snapshots or a permanent delete of the
       * page removed the snapshot before, and the page must show it
       */
      refresh();

      return { error: t("Common.badRequest"), requestPayload: formData };
    }

    const scoped = await getWikiPageScopedContext(snapshot.pageId);
    const page = scoped?.context.pagesById.get(snapshot.pageId);
    if (!scoped || !page || page.deletedAt) {
      /**
       * A different user or tab deleted the page before, and the page must
       * show it. A context that the viewer cannot hold gets the same answer
       * (see getWikiPageScopedContext).
       */
      refresh();

      return { error: t("Common.badRequest"), requestPayload: formData };
    }
    const context = scoped.context;
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (isWikiScopeFrozen(scoped)) return rejectFrozenWikiScope(formData);

    /**
     * Snapshots may predate editor schema changes — validate against the
     * current schema instead of blindly restoring.
     */
    let normalized: unknown;
    try {
      const documentNode = ProseMirrorNode.fromJSON(
        getWikiEditorSchema(),
        snapshot.content,
      );
      documentNode.check();
      normalized = documentNode.toJSON();
    } catch {
      return {
        error:
          "Der Snapshot ist mit der aktuellen Editor-Version nicht mehr kompatibel.",
        requestPayload: formData,
      };
    }

    const entityId = authentication.session.entity?.id ?? null;

    await createWikiPageSafetySnapshot({
      pageId: page.id,
      name: "Automatische Sicherung vor Wiederherstellung",
      createdById: entityId,
    });

    /**
     * The safety snapshot is a committed write: the snapshot list must show
     * it also when the collab replace below fails
     */
    refresh();

    try {
      await replaceWikiPageContent({
        pageId: page.id,
        content: normalized as object,
        updatedByEntityId: entityId,
      });
    } catch (error) {
      unstable_rethrow(error);
      log.error("Wiki snapshot restore failed", {
        error,
      });
      return {
        error:
          "Wiederherstellen fehlgeschlagen — der Collaboration-Server ist nicht erreichbar. Bitte versuche es später erneut.",
        requestPayload: formData,
      };
    }

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_SNAPSHOT_RESTORED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          snapshotId: snapshot.id,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    return { success: "Snapshot wiederhergestellt." };
  },
);
