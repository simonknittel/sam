"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { log } from "@/modules/logging";
import { WikiPageSnapshotKind } from "@sam-monorepo/database/client";
import { getWikiEditorSchema } from "@sam-monorepo/wiki-editor";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
  revalidateWikiScope,
} from "../queries/getWikiPageScopedContext";
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
    if (!snapshot)
      return { error: t("Common.badRequest"), requestPayload: formData };

    const scoped = await getWikiPageScopedContext(snapshot.pageId);
    if (!scoped)
      return { error: t("Common.badRequest"), requestPayload: formData };
    const context = scoped.context;

    const page = context.pagesById.get(snapshot.pageId);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!context.permissions.get(page.id)?.canAdmin)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (isWikiScopeFrozen(scoped))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };

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

    const currentContent = await prisma.wikiPage.findUnique({
      where: { id: page.id },
      select: { content: true },
    });
    if (currentContent?.content) {
      await prisma.wikiPageSnapshot.create({
        data: {
          pageId: page.id,
          kind: WikiPageSnapshotKind.MANUAL,
          name: "Automatische Sicherung vor Wiederherstellung",
          content: currentContent.content,
          createdById: entityId,
        },
      });
    }

    try {
      await replaceWikiPageContent({
        pageId: page.id,
        content: normalized as object,
        updatedByEntityId: entityId,
      });
    } catch (error) {
      unstable_rethrow(error);
      log.error("Wiki snapshot restore failed", {
        error: serializeError(error),
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

    revalidateWikiScope(scoped);

    return { success: "Snapshot wiederhergestellt." };
  },
);
