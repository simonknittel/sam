import { prisma } from "@/db";
import { env } from "@/env";
import {
  WIKI_EDITOR_FRAGMENT,
  extractWikiPageText,
  getWikiEditorSchema,
} from "@sam-monorepo/wiki-editor";
import { SignJWT } from "jose";
import { prosemirrorJSONToYDoc } from "y-prosemirror";
import * as Y from "yjs";

const REPLACE_REQUEST_TIMEOUT_MS = 15_000;

interface Options {
  readonly pageId: string;
  /** Tiptap JSON, already validated against the editor schema */
  readonly content: object;
  readonly updatedByEntityId: string | null;
}

/**
 * Fully replaces a page's content — the shared write path of snapshot
 * restore and JSON import. With the collab server configured, the replace
 * goes through its internal endpoint so connected clients converge on the
 * new content (the server persists `content`/`searchText`/`ydoc` on
 * disconnect of the internal connection). Without it, the content and a
 * regenerated Yjs document are written directly.
 *
 * Throws when the collab server is configured but the replace request
 * fails — writing directly in that case would fork any live editing
 * session.
 */
export const replaceWikiPageContent = async ({
  pageId,
  content,
  updatedByEntityId,
}: Options) => {
  if (env.COLLAB_JWT_SECRET && env.NEXT_PUBLIC_COLLAB_URL) {
    const replaceUrl = new URL("/replace", env.NEXT_PUBLIC_COLLAB_URL);
    replaceUrl.protocol = replaceUrl.protocol === "ws:" ? "http:" : "https:";

    const token = await new SignJWT({
      scope: "replace",
      pageId,
      entityId: updatedByEntityId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("60s")
      .sign(new TextEncoder().encode(env.COLLAB_JWT_SECRET));

    const response = await fetch(replaceUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(REPLACE_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok)
      throw new Error(
        `Collab replace request failed with status ${response.status}`,
      );

    return;
  }

  const ydoc = Uint8Array.from(
    Y.encodeStateAsUpdate(
      prosemirrorJSONToYDoc(
        getWikiEditorSchema(),
        content,
        WIKI_EDITOR_FRAGMENT,
      ),
    ),
  );

  await prisma.wikiPage.update({
    where: { id: pageId },
    data: {
      content,
      searchText: extractWikiPageText(content).slice(0, 200_000),
      ydoc,
      updatedById: updatedByEntityId,
    },
  });
};
