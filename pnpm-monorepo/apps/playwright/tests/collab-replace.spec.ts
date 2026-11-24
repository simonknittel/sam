import { createHmac } from "node:crypto";
import {
  createCitizen,
  createWikiPage,
  WikiPageVisibility,
} from "../fixtures/factories";
import { COLLAB_PERSISTENCE_TIMEOUT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import { collabJwtSecret } from "../setup/stack";

/** The token is hand-rolled, so that the test needs no jose dependency. */
interface ReplaceTokenOptions {
  readonly secret?: string;
  readonly expiresInSeconds?: number;
}

const signReplaceToken = (
  pageId: string,
  entityId: string | null,
  { secret = collabJwtSecret, expiresInSeconds = 60 }: ReplaceTokenOptions = {},
) => {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    scope: "replace",
    pageId,
    entityId,
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  });
  const signature = createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
};

const replaceBody = (citizenId: string) => ({
  content: {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "wikiCitizenMention",
            attrs: { citizenId, handle: "Zielperson" },
          },
        ],
      },
    ],
  },
});

const REQUEST_TIMEOUT = 15_000;

/** Runs in its own Playwright project, see playwright.config.ts. */
test("a programmatic /replace creates suppressed links only", async ({
  collabHttpUrl,
  prisma,
}) => {
  const author = await createCitizen(prisma, { handle: "author" });
  const mentioned = await createCitizen(prisma, { handle: "Zielperson" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Transplantat",
    visibility: WikiPageVisibility.PUBLIC,
  });

  /**
   * Node's fetch, because the client of Playwright's request fixture trips over
   * Hocuspocus' plain-HTTP handling.
   */
  const response = await fetch(`${collabHttpUrl}/replace`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${signReplaceToken(wikiPage.id, author.entity.id)}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(replaceBody(mentioned.entity.id)),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });
  expect(response.ok).toBe(true);

  await expect
    .poll(
      () =>
        prisma.wikiPageCitizenMention.findUnique({
          where: {
            pageId_citizenId: {
              pageId: wikiPage.id,
              citizenId: mentioned.entity.id,
            },
          },
          select: { suppressedAt: true, notifiedAt: true },
        }),
      { timeout: COLLAB_PERSISTENCE_TIMEOUT },
    )
    .toEqual({ suppressedAt: expect.any(Date), notifiedAt: null });

  const pendingCount = await prisma.wikiPageCitizenMention.count({
    where: { pageId: wikiPage.id, suppressedAt: null },
  });
  expect(pendingCount).toBe(0);
});

const REJECTED_TOKENS = [
  {
    name: "a signature from a foreign secret",
    options: { secret: "not-the-collab-secret" },
  },
  { name: "an expired token", options: { expiresInSeconds: -60 } },
] as const;

for (const { name, options } of REJECTED_TOKENS) {
  test(`a /replace with ${name} is refused and writes nothing`, async ({
    collabHttpUrl,
    prisma,
  }) => {
    const author = await createCitizen(prisma, { handle: "author" });
    const mentioned = await createCitizen(prisma, { handle: "Zielperson" });
    const wikiPage = await createWikiPage(prisma, {
      title: "Unantastbar",
      visibility: WikiPageVisibility.PUBLIC,
    });

    const response = await fetch(`${collabHttpUrl}/replace`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${signReplaceToken(
          wikiPage.id,
          author.entity.id,
          options,
        )}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(replaceBody(mentioned.entity.id)),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT),
    });

    expect(response.status).toBe(401);

    const stored = await prisma.wikiPage.findUniqueOrThrow({
      where: { id: wikiPage.id },
      select: { content: true, ydoc: true },
    });
    expect(stored.content).toBeNull();
    expect(stored.ydoc).toBeNull();
    expect(
      await prisma.wikiPageCitizenMention.count({
        where: { pageId: wikiPage.id },
      }),
    ).toBe(0);
  });
}

test("a /replace without an authorization header is refused", async ({
  collabHttpUrl,
  prisma,
}) => {
  const mentioned = await createCitizen(prisma, { handle: "Zielperson" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Unantastbar",
    visibility: WikiPageVisibility.PUBLIC,
  });

  const response = await fetch(`${collabHttpUrl}/replace`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(replaceBody(mentioned.entity.id)),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT),
  });

  expect(response.status).toBe(401);
  const stored = await prisma.wikiPage.findUniqueOrThrow({
    where: { id: wikiPage.id },
    select: { content: true },
  });
  expect(stored.content).toBeNull();
});
