import { createHmac } from "node:crypto";
import {
  createCitizen,
  createWikiPage,
  WikiPageVisibility,
} from "../fixtures/factories";
import { expect, test } from "../fixtures/test";
import { collabJwtSecret } from "../setup/stack";

/**
 * The internal replace endpoint authenticates with a short-lived HS256 JWT
 * (claims: scope/pageId/entityId) signed with the shared collab secret —
 * hand-rolled here so the test needs no jose dependency.
 */
const signReplaceToken = (pageId: string, entityId: string | null) => {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({
    scope: "replace",
    pageId,
    entityId,
    exp: Math.floor(Date.now() / 1000) + 60,
  });
  const signature = createHmac("sha256", collabJwtSecret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
};

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
    body: JSON.stringify({
      content: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "wikiCitizenMention",
                attrs: {
                  citizenId: mentioned.entity.id,
                  handle: "Zielperson",
                },
              },
            ],
          },
        ],
      },
    }),
    signal: AbortSignal.timeout(15_000),
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
      { timeout: 20_000 },
    )
    .toEqual({ suppressedAt: expect.any(Date), notifiedAt: null });

  const pendingCount = await prisma.wikiPageCitizenMention.count({
    where: { pageId: wikiPage.id, suppressedAt: null },
  });
  expect(pendingCount).toBe(0);
});
