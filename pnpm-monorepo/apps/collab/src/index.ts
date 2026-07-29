import { Server } from "@hocuspocus/server";
import { prisma } from "@sam-monorepo/database";
import { WikiPageSnapshotKind } from "@sam-monorepo/database/client";
import {
  WIKI_EDITOR_FRAGMENT,
  extractWikiPageText,
  getWikiEditorSchema,
} from "@sam-monorepo/wiki-editor";
import { jwtVerify } from "jose";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  prosemirrorJSONToYDoc,
  prosemirrorToYXmlFragment,
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

const replaceTokenSchema = z.object({
  scope: z.literal("replace"),
  pageId: z.string(),
  entityId: z.string().nullable(),
});

const replaceBodySchema = z.object({
  content: z.unknown(),
});

interface ConnectionContext {
  userId: string;
  entityId: string | null;
  canEdit: boolean;
  /** Server-internal connections (replace endpoint) write no audit events */
  isInternal?: boolean;
  didEdit?: boolean;
}

const secret = new TextEncoder().encode(env.COLLAB_JWT_SECRET);

const editorSchema = getWikiEditorSchema();

/**
 * Create an AUTO snapshot when the newest snapshot of the page is older
 * than this and the content changed since.
 */
const AUTO_SNAPSHOT_MIN_INTERVAL_MS = 30 * 60 * 1000;
/** AUTO snapshots kept per page (MANUAL ones are kept forever) */
const AUTO_SNAPSHOT_RETENTION = 50;

/** Generous cap over the app's 2M-character content limit */
const REPLACE_MAX_BODY_BYTES = 4 * 1024 * 1024;

const readRequestBody = (
  request: IncomingMessage,
  maxBytes: number,
): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;
    request.on("data", (chunk: Buffer) => {
      received += chunk.length;
      if (received > maxBytes) {
        request.destroy();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
};

const respondJson = (
  response: ServerResponse,
  status: number,
  body: object,
) => {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
};

/**
 * Preserves the page's stored content as an automatic snapshot before it
 * is overwritten, at most every 30 minutes: any state is snapshotted right
 * before edits replace it, so there is always a restore point at most 30
 * minutes behind — without a manual "save" step. Mirrors
 * maybeCreateWikiAutoSnapshot in the app (its single-user autosave path).
 *
 * The common case (a recent snapshot exists) costs one indexed query; the
 * content comparison only runs when the cadence has passed.
 */
const maybeCreateAutoSnapshot = async (pageId: string) => {
  const newestSnapshot = await prisma.wikiPageSnapshot.findFirst({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  if (
    newestSnapshot &&
    Date.now() - newestSnapshot.createdAt.getTime() <
      AUTO_SNAPSHOT_MIN_INTERVAL_MS
  )
    return;

  const page = await prisma.wikiPage.findUnique({
    where: { id: pageId },
    select: { content: true },
  });
  if (!page?.content) return;

  if (newestSnapshot) {
    const newestContent = await prisma.wikiPageSnapshot.findUnique({
      where: { id: newestSnapshot.id },
      select: { content: true },
    });
    if (JSON.stringify(newestContent?.content) === JSON.stringify(page.content))
      return;
  }

  await prisma.wikiPageSnapshot.create({
    data: {
      pageId,
      kind: WikiPageSnapshotKind.AUTO,
      content: page.content,
    },
  });

  const excessSnapshots = await prisma.wikiPageSnapshot.findMany({
    where: { pageId, kind: WikiPageSnapshotKind.AUTO },
    orderBy: { createdAt: "desc" },
    skip: AUTO_SNAPSHOT_RETENTION,
    select: { id: true },
  });
  if (excessSnapshots.length > 0)
    await prisma.wikiPageSnapshot.deleteMany({
      where: { id: { in: excessSnapshots.map((snapshot) => snapshot.id) } },
    });
};

/**
 * Internal "replace document content" command from the Next.js app
 * (snapshot restore, JSON import). Goes through a direct connection so a
 * live editing session converges on the new content; without one the
 * document is loaded, replaced and persisted the same way. Authenticated
 * with a short-lived JWT signed with the shared secret.
 */
const handleReplaceRequest = async (
  request: IncomingMessage,
  response: ServerResponse,
) => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    respondJson(response, 401, { error: "Unauthorized" });
    return;
  }

  let pageId: string;
  let entityId: string | null;
  try {
    const { payload } = await jwtVerify(
      authorization.slice("Bearer ".length),
      secret,
      { algorithms: ["HS256"] },
    );
    const result = replaceTokenSchema.parse(payload);
    pageId = result.pageId;
    entityId = result.entityId;
  } catch {
    respondJson(response, 401, { error: "Unauthorized" });
    return;
  }

  const body = await readRequestBody(request, REPLACE_MAX_BODY_BYTES);
  if (body === null) {
    respondJson(response, 413, { error: "Payload too large" });
    return;
  }

  let contentNode;
  try {
    const parsed = replaceBodySchema.parse(JSON.parse(body));
    contentNode = editorSchema.nodeFromJSON(parsed.content);
    contentNode.check();
  } catch {
    respondJson(response, 400, { error: "Invalid content" });
    return;
  }

  let connection;
  try {
    const context: ConnectionContext = {
      userId: "",
      entityId,
      canEdit: true,
      isInternal: true,
    };
    connection = await server.hocuspocus.openDirectConnection(pageId, context);
  } catch {
    respondJson(response, 404, { error: "Unknown document" });
    return;
  }

  try {
    await connection.transact((document) => {
      prosemirrorToYXmlFragment(
        contentNode,
        document.getXmlFragment(WIKI_EDITOR_FRAGMENT),
      );
    });
  } finally {
    /**
     * Persists the replaced content immediately (content/searchText/ydoc
     * via onStoreDocument) before the response is sent.
     */
    await connection.disconnect();
  }

  respondJson(response, 200, { ok: true });
};

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

  async onRequest(data) {
    if (data.request.method === "POST" && data.request.url === "/replace") {
      try {
        await handleReplaceRequest(data.request, data.response);
      } catch (error) {
        console.error("[collab] Replace request failed", error);
        if (!data.response.headersSent)
          respondJson(data.response, 500, { error: "Internal server error" });
      }
      /**
       * Rejecting with a falsy value stops Hocuspocus' default request
       * handler without crashing the HTTP server (see Server.requestHandler).
       */
      throw null;
    }
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
        WIKI_EDITOR_FRAGMENT,
      );
      Y.applyUpdate(data.document, Y.encodeStateAsUpdate(seeded));
    }

    return data.document;
  },

  async onStoreDocument(data) {
    const content = yXmlFragmentToProseMirrorRootNode(
      data.document.getXmlFragment(WIKI_EDITOR_FRAGMENT),
      editorSchema,
    ).toJSON() as object;
    const lastEditorEntityId = data.lastContext?.entityId ?? null;
    // Y.encodeStateAsUpdate returns Uint8Array<ArrayBufferLike>, which is
    // not assignable to Prisma's Bytes input (Uint8Array<ArrayBuffer>);
    // Uint8Array.from copies into an ArrayBuffer-backed array
    const ydoc = Uint8Array.from(Y.encodeStateAsUpdate(data.document));

    /**
     * Before overwriting, preserve the stored state as an automatic
     * snapshot when the 30-minute cadence has passed. Never lets a failed
     * snapshot block the store itself.
     */
    try {
      await maybeCreateAutoSnapshot(data.documentName);
    } catch (error) {
      console.error("[collab] Auto-snapshot failed", error);
    }

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
     * database column is a plain string). Internal connections (replace
     * endpoint) skip this — the app writes its own, more specific event.
     */
    if (!data.context?.didEdit || data.context.isInternal) return;

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
