import { Server } from "@hocuspocus/server";
import { prisma } from "@sam-monorepo/database";
import {
  extractWikiPageText,
  getWikiEditorSchema,
} from "@sam-monorepo/wiki-editor";
import { jwtVerify } from "jose";
import {
  prosemirrorJSONToYDoc,
  yXmlFragmentToProseMirrorRootNode,
} from "y-prosemirror";
import * as Y from "yjs";
import { z } from "zod";
import { env } from "./env.js";

/**
 * The Yjs collaboration backend for the wiki (see PLAN-wiki.md §5). The
 * Next.js app remains the single permission authority: it mints short-lived
 * JWTs per page and viewer, this server only verifies them and persists
 * documents. The editor schema is shared with the app through
 * @sam-monorepo/wiki-editor. Deployed next to Soketi via the core-services
 * repository.
 */

const tokenSchema = z.object({
  sub: z.string(),
  pageId: z.string(),
  entityId: z.string().nullable(),
  canEdit: z.boolean(),
});

interface ConnectionContext {
  userId: string;
  entityId: string | null;
  canEdit: boolean;
  didEdit?: boolean;
}

const secret = new TextEncoder().encode(env.COLLAB_JWT_SECRET);

/** Tiptap's Collaboration extension uses this Yjs fragment name */
const FRAGMENT = "default";

const editorSchema = getWikiEditorSchema();

const server = new Server<ConnectionContext>({
  port: env.PORT,
  debounce: 2_000,
  maxDebounce: 10_000,

  async onAuthenticate(data) {
    const { payload } = await jwtVerify(data.token, secret, {
      algorithms: ["HS256"],
    });
    const result = tokenSchema.safeParse(payload);
    if (!result.success) throw new Error("Invalid token payload");
    if (result.data.pageId !== data.documentName)
      throw new Error("Token does not match the requested document");

    if (!result.data.canEdit) data.connectionConfig.readOnly = true;

    const context: ConnectionContext = {
      userId: result.data.sub,
      entityId: result.data.entityId,
      canEdit: result.data.canEdit,
    };
    return context;
  },

  async onLoadDocument(data) {
    const page = await prisma.wikiPage.findUnique({
      where: { id: data.documentName },
      select: { ydoc: true, content: true, deletedAt: true },
    });
    if (!page || page.deletedAt) throw new Error("Unknown document");

    if (page.ydoc) {
      Y.applyUpdate(data.document, new Uint8Array(page.ydoc));
    } else if (page.content) {
      /**
       * First collab session of a page that predates collaboration: seed
       * the Yjs document from the stored content JSON. Persisted by the
       * next onStoreDocument.
       */
      const seeded = prosemirrorJSONToYDoc(
        editorSchema,
        page.content,
        FRAGMENT,
      );
      Y.applyUpdate(data.document, Y.encodeStateAsUpdate(seeded));
    }

    return data.document;
  },

  async onStoreDocument(data) {
    const content = yXmlFragmentToProseMirrorRootNode(
      data.document.getXmlFragment(FRAGMENT),
      editorSchema,
    ).toJSON() as object;
    const lastEditorEntityId = data.lastContext?.entityId ?? null;
    // Y.encodeStateAsUpdate returns Uint8Array<ArrayBufferLike>, which is
    // not assignable to Prisma's Bytes input (Uint8Array<ArrayBuffer>);
    // Uint8Array.from copies into an ArrayBuffer-backed array
    const ydoc = Uint8Array.from(Y.encodeStateAsUpdate(data.document));

    await prisma.wikiPage.update({
      where: { id: data.documentName },
      data: {
        ydoc,
        content,
        searchText: extractWikiPageText(content).slice(0, 200_000),
        ...(lastEditorEntityId ? { updatedById: lastEditorEntityId } : {}),
      },
    });
  },

  async onChange(data) {
    if (data.context) data.context.didEdit = true;
  },

  async onDisconnect(data) {
    /**
     * One audit event per editing session, mirroring the app's
     * AuditEventType.WIKI_PAGE_UPDATED (the enum lives in the app; the
     * database column is a plain string).
     */
    if (!data.context?.didEdit) return;

    await prisma.auditEvent.create({
      data: {
        type: "WIKI_PAGE_UPDATED",
        data: JSON.stringify({ pageId: data.documentName }),
        createdById: data.context.userId,
      },
    });
  },
});

await server.listen();
console.log(`[collab] Listening on port ${env.PORT}`);
