import { env } from "@/env";
import { SignJWT } from "jose";

const REPLACE_REQUEST_TIMEOUT_MS = 15_000;

interface Options {
  readonly pageId: string;
  /** Tiptap JSON, already validated against the editor schema */
  readonly content: object;
  readonly updatedByEntityId: string | null;
}

/**
 * Fully replaces a page's content — the shared write path of snapshot
 * restore and JSON import. The replace always goes through the collab
 * server's internal endpoint so connected clients converge on the new
 * content (the server persists `content`/`searchText`/`ydoc` on disconnect
 * of the internal connection).
 *
 * Throws when the collab server is not configured or the replace request
 * fails — writing to the database directly would fork any live editing
 * session.
 */
export const replaceWikiPageContent = async ({
  pageId,
  content,
  updatedByEntityId,
}: Options) => {
  if (!env.COLLAB_JWT_SECRET || !env.NEXT_PUBLIC_COLLAB_URL)
    throw new Error(
      "The collab server is not configured — wiki content can only be replaced through it",
    );

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
};
