import { expect, test } from "../fixtures/test";

/**
 * The counterpart of this endpoint — an iframe `src` carrying a token —
 * cannot be asserted yet: no external app opts into embed authentication,
 * and none of the three Google-hosted ones may (see
 * docs/embedded-app-authentication.md). That assertion belongs to the
 * change that onboards the first consumer.
 */
test("JWKS is publicly readable without a session", async ({ request }) => {
  const response = await request.get("/.well-known/jwks.json");

  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain(
    "application/jwk-set+json",
  );

  const body = (await response.json()) as {
    keys: Record<string, unknown>[];
  };

  expect(body.keys).toHaveLength(1);
  expect(body.keys[0]).toMatchObject({
    kty: "EC",
    crv: "P-256",
    alg: "ES256",
    use: "sig",
    kid: expect.any(String),
  });

  // "d" is the private scalar of an EC key and must never be published
  expect(Object.keys(body.keys[0]!)).not.toContain("d");
});
