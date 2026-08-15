"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { log } from "@/modules/logging";
import { WikiPageSnapshotKind } from "@sam-monorepo/database/client";
import {
  collectWikiIframeSrcs,
  getWikiEditorSchema,
  isWikiIframeSrcAllowed,
} from "@sam-monorepo/wiki-editor";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";
import { z } from "zod";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
  revalidateWikiScope,
} from "../queries/getWikiPageScopedContext";
import { getWikiIframeAllowlist } from "../queries/getWikiSettings";
import { replaceWikiPageContent } from "../utils/replaceWikiPageContent";
import { WikiScope } from "../utils/wikiPageHref";

const schema = z.object({
  id: z.cuid2(),
  /** Tiptap JSON document, stringified — the uploaded file's text */
  content: z.string().max(2_000_000),
});

/**
 * Fully replaces a page's content with uploaded Tiptap JSON. An import
 * injects arbitrary node structures, bypassing the editor's insertion-time
 * validation, so it stays an admin tool: `wiki;manage` for the global wiki,
 * the event managers for event pages (the structures land only in their
 * own event wiki, which they control anyway). No merge semantics; the
 * automatic safety snapshot is the undo path.
 */
export const importWikiPageContent = createAuthenticatedAction(
  "importWikiPageContent",
  schema,
  async (formData, authentication, data, t) => {
    const scoped = await getWikiPageScopedContext(data.id);
    if (!scoped)
      return { error: t("Common.badRequest"), requestPayload: formData };
    const context = scoped.context;

    const page = context.pagesById.get(data.id);
    if (!page || page.deletedAt)
      return { error: t("Common.badRequest"), requestPayload: formData };
    const allowed =
      scoped.scope === WikiScope.Event
        ? context.permissions.get(page.id)?.canAdmin === true
        : await authentication.authorize("wiki", "manage");
    if (!allowed)
      return { error: t("Common.forbidden"), requestPayload: formData };
    if (isWikiScopeFrozen(scoped))
      return {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      };

    /**
     * Reject unknown node/mark types and invalid structures — the file may
     * come from an older editor version or a foreign source.
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
      return {
        error:
          "Die Datei ist kein gültiges Wiki-Dokument (Tiptap JSON) oder enthält nicht unterstützte Inhalte.",
        requestPayload: formData,
      };
    }

    /**
     * Imports bypass the insertion-time iframe validation — re-check every
     * generic iframe against the allowlist.
     */
    const iframeAllowlist = await getWikiIframeAllowlist();
    const disallowedSrcs = collectWikiIframeSrcs(normalized).filter(
      (src) => !isWikiIframeSrcAllowed(src, iframeAllowlist),
    );
    if (disallowedSrcs.length > 0)
      return {
        error: `Die Datei enthält iframes von nicht erlaubten Domains: ${disallowedSrcs.join(", ")}`,
        requestPayload: formData,
      };

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
          name: "Automatische Sicherung vor Import",
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
      log.error("Wiki content import failed", {
        error: serializeError(error),
      });
      return {
        error:
          "Import fehlgeschlagen — der Collaboration-Server ist nicht erreichbar. Bitte versuche es später erneut.",
        requestPayload: formData,
      };
    }

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_PAGE_CONTENT_IMPORTED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidateWikiScope(scoped);

    return { success: "Inhalt importiert." };
  },
);
