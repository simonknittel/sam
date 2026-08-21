import type { PermissionSet } from "@sam-monorepo/permissions";
import { createLocalJWKSet, decodeProtectedHeader, jwtVerify } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { describe, expect, test } from "vitest";
import { EMBED_TOKEN_LIFETIME_IN_SECONDS } from "./constants";
import {
  createEmbedJsonWebKeySet,
  createEmbedSigningKey,
} from "./embedSigningKey";
import {
  appendEmbedToken,
  collectEmbedPermissionStrings,
  signEmbedToken,
} from "./embedToken";

const generateSigningKey = () => {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pem = privateKey.export({ format: "pem", type: "pkcs8" }) as string;

  return createEmbedSigningKey(Buffer.from(pem).toString("base64"));
};

const ISSUER = "https://sam.example.com";
const AUDIENCE = "https://embedded-app.example.com";

describe("collect embed permission strings", () => {
  const givenPermissionSets: PermissionSet[] = [
    { resource: "event", operation: "read" },
    { resource: "wiki", operation: "manage" },
    {
      resource: "event",
      operation: "manage",
      attributes: [{ key: "roleId", value: "some-role" }],
    },
    { resource: "citizen", operation: "read" },
  ];

  test("keeps only the resources the app declared", () => {
    expect(
      collectEmbedPermissionStrings(givenPermissionSets, ["event"]),
    ).toEqual(["event;manage;roleId=some-role", "event;read"]);
  });

  test("returns an empty array for a user without matching permissions", () => {
    expect(collectEmbedPermissionStrings([], ["event"])).toEqual([]);
    expect(collectEmbedPermissionStrings(givenPermissionSets, [])).toEqual([]);
  });

  test("deduplicates the same permission granted by several roles", () => {
    expect(
      collectEmbedPermissionStrings(
        [
          { resource: "event", operation: "read" },
          { resource: "event", operation: "read" },
        ],
        ["event"],
      ),
    ).toEqual(["event;read"]);
  });

  test("orders deterministically regardless of the role order", () => {
    expect(
      collectEmbedPermissionStrings(givenPermissionSets, ["wiki", "event"]),
    ).toEqual(
      collectEmbedPermissionStrings([...givenPermissionSets].reverse(), [
        "event",
        "wiki",
      ]),
    );
  });
});

describe("append embed token", () => {
  test("adds the token as a query parameter", () => {
    expect(appendEmbedToken("https://embedded-app.example.com/", "token")).toBe(
      "https://embedded-app.example.com/?jwt=token",
    );
  });

  test("keeps the existing query of the embed URL", () => {
    expect(
      appendEmbedToken(
        "https://embedded-app.example.com/?embedded=true",
        "a.b",
      ),
    ).toBe("https://embedded-app.example.com/?embedded=true&jwt=a.b");
  });

  test("returns the URL byte-identical without a token", () => {
    const embedUrl =
      "https://docs.google.com/forms/d/e/1FAIpQLSeHEgpv4/viewform";

    expect(appendEmbedToken(embedUrl, null)).toBe(embedUrl);
  });
});

describe("sign embed token", () => {
  test("verifies against the JWKS the app publishes for the same key", async () => {
    const signingKey = await generateSigningKey();

    const token = await signEmbedToken({
      signingKey,
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: "clhaw95yi0000jr08ybuvy137",
      handle: "Waffelkeks",
      permissionStrings: ["event;read"],
    });

    const { payload, protectedHeader } = await jwtVerify(
      token,
      createLocalJWKSet(createEmbedJsonWebKeySet(signingKey)),
      { issuer: ISSUER, audience: AUDIENCE, algorithms: ["ES256"] },
    );

    expect(protectedHeader).toMatchObject({
      alg: "ES256",
      kid: signingKey.keyId,
    });
    expect(payload).toMatchObject({
      iss: ISSUER,
      aud: AUDIENCE,
      sub: "clhaw95yi0000jr08ybuvy137",
      preferred_username: "Waffelkeks",
      permissions: ["event;read"],
    });
    expect(payload.jti).toEqual(expect.any(String));
    expect(payload.exp! - payload.iat!).toBe(EMBED_TOKEN_LIFETIME_IN_SECONDS);
  });

  test("omits preferred_username for an entity without a handle", async () => {
    const signingKey = await generateSigningKey();

    const token = await signEmbedToken({
      signingKey,
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: "clhaw95yi0000jr08ybuvy137",
      handle: null,
      permissionStrings: [],
    });

    const { payload } = await jwtVerify(
      token,
      createLocalJWKSet(createEmbedJsonWebKeySet(signingKey)),
      { issuer: ISSUER, audience: AUDIENCE, algorithms: ["ES256"] },
    );

    expect(payload).not.toHaveProperty("preferred_username");
    expect(payload.permissions).toEqual([]);
  });

  test("does not verify against the JWKS of another key", async () => {
    const [signingKey, otherSigningKey] = await Promise.all([
      generateSigningKey(),
      generateSigningKey(),
    ]);

    const token = await signEmbedToken({
      signingKey,
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: "clhaw95yi0000jr08ybuvy137",
      handle: null,
      permissionStrings: [],
    });

    await expect(
      jwtVerify(
        token,
        createLocalJWKSet(createEmbedJsonWebKeySet(otherSigningKey)),
        { issuer: ISSUER, audience: AUDIENCE, algorithms: ["ES256"] },
      ),
    ).rejects.toThrow();
  });

  test("does not verify for another audience", async () => {
    const signingKey = await generateSigningKey();

    const token = await signEmbedToken({
      signingKey,
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: "clhaw95yi0000jr08ybuvy137",
      handle: null,
      permissionStrings: [],
    });

    await expect(
      jwtVerify(
        token,
        createLocalJWKSet(createEmbedJsonWebKeySet(signingKey)),
        {
          issuer: ISSUER,
          audience: "https://other-app.example.com",
          algorithms: ["ES256"],
        },
      ),
    ).rejects.toThrow();
  });

  test("gives every token its own jti", async () => {
    const signingKey = await generateSigningKey();

    const parameters = {
      signingKey,
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: "clhaw95yi0000jr08ybuvy137",
      handle: null,
      permissionStrings: [],
    };

    const [first, second] = await Promise.all([
      signEmbedToken(parameters),
      signEmbedToken(parameters),
    ]);

    const keySet = createLocalJWKSet(createEmbedJsonWebKeySet(signingKey));
    const [firstPayload, secondPayload] = await Promise.all([
      jwtVerify(first, keySet, { issuer: ISSUER, audience: AUDIENCE }),
      jwtVerify(second, keySet, { issuer: ISSUER, audience: AUDIENCE }),
    ]);

    expect(firstPayload.payload.jti).not.toBe(secondPayload.payload.jti);
  });

  test("announces the key id in the header so a verifier can pick the key", async () => {
    const signingKey = await generateSigningKey();

    const token = await signEmbedToken({
      signingKey,
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: "clhaw95yi0000jr08ybuvy137",
      handle: null,
      permissionStrings: [],
    });

    expect(decodeProtectedHeader(token).kid).toBe(
      createEmbedJsonWebKeySet(signingKey).keys[0].kid,
    );
  });
});
