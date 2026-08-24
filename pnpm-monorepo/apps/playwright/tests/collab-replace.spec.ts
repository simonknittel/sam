import { createHmac } from "node:crypto";
import {
  createCitizen,
  createWikiPage,
  WikiPageVisibility,
} from "../fixtures/factories";
import { COLLAB_PERSISTENCE_TIMEOUT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import { collabJwtSecret } from "../setup/stack";

/**
 * The internal replace endpoint authenticates with a short-lived HS256 JWT
 * (claims: scope/pageId/entityId) signed with the shared collab secret —
 * hand-rolled here so the test needs no jose dependency.
 */
interface ReplaceTokenOptions {
  /** Signs with a secret the server does not know */
  readonly secret?: string;
  /** Seconds from now the token stops being valid */
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

/** The transplanted document every request below carries */
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

/**
 * Runs in its own Playwright project (see playwright.config.ts) and
 * therefore in its own worker with a fresh stack: a websocket editing
 * session's teardown writes (final store, audit event) race the next test's
 * TRUNCATE and can deadlock the collab container, killing direct HTTP
 * requests — so this test must never share a stack with editor tests.
 */
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
   * Node's fetch instead of Playwright's request fixture, whose client
   * trips over Hocuspocus' plain-HTTP handling. The container is waited on
   * with its /health route, so the endpoint is serving by now.
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

/**
 * The endpoint replaces a page's whole content, so anything but a token this
 * server itself could have minted has to bounce off it.
 */
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
