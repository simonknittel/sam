import type { PermissionSet } from "@sam-monorepo/permissions";
import { createLocalJWKSet, jwtVerify } from "jose";
import type { Session } from "next-auth";
import { generateKeyPairSync } from "node:crypto";
import { beforeEach, describe, expect, test, vi } from "vitest";
import {
  createEmbedJsonWebKeySet,
  createEmbedSigningKey,
} from "./embedSigningKey";
import type { EmbedAuthentication } from "./types";

const ISSUER = "https://sam.example.com";

const EMBED_URL = "https://embedded-app.example.com/board?view=all";

const EMBED_AUTHENTICATION: EmbedAuthentication = {
  audience: "https://embedded-app.example.com",
  permissionResources: ["event"],
};

const generateBase64EncodedPrivateKeyPem = () => {
  const { privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const pem = privateKey.export({ format: "pem", type: "pkcs8" }) as string;

  return Buffer.from(pem).toString("base64");
};

const buildSession = (entity: Session["entity"]): Session =>
  ({
    user: { id: "clhaw95yi0000jr08ybuvy137", role: "admin" },
    entity,
    givenPermissionSets: [
      { resource: "event", operation: "read" },
      { resource: "wiki", operation: "manage" },
    ] satisfies PermissionSet[],
  }) as Session;

const buildEntity = (handle: string | null) =>
  ({ id: "clog1zezo04isul0nfes57hmo", handle }) as NonNullable<
    Session["entity"]
  >;

const logWarn = vi.fn();

/**
 * The signing key is memoized per process and read from the environment,
 * so each case gets its own module graph. This is also what lets the tests
 * cover the deployment without a configured key.
 */
const importResolveEmbedUrl = async (base64EncodedPrivateKeyPem?: string) => {
  vi.resetModules();
  vi.doMock("server-only", () => ({}));
  vi.doMock("@/env", () => ({
    env: {
      NEXT_PUBLIC_BASE_URL: ISSUER,
      EMBED_JWT_PRIVATE_KEY: base64EncodedPrivateKeyPem,
    },
  }));
  vi.doMock("@/modules/logging", () => ({
    log: { info: vi.fn(), warn: logWarn, error: vi.fn() },
  }));

  return (await import("./resolveEmbedUrl")).resolveEmbedUrl;
};

beforeEach(() => {
  logWarn.mockClear();
});

describe("resolve embed URL", () => {
  test("appends a token an embedded app can verify", async () => {
    const base64EncodedPrivateKeyPem = generateBase64EncodedPrivateKeyPem();
    const resolveEmbedUrl = await importResolveEmbedUrl(
      base64EncodedPrivateKeyPem,
    );

    const resolvedUrl = await resolveEmbedUrl(
      EMBED_URL,
      buildSession(buildEntity("ind3x")),
      EMBED_AUTHENTICATION,
    );

    const token = new URL(resolvedUrl).searchParams.get("jwt");
    const { payload } = await jwtVerify(
      token!,
      createLocalJWKSet(
        createEmbedJsonWebKeySet(
          await createEmbedSigningKey(base64EncodedPrivateKeyPem),
        ),
      ),
      {
        issuer: ISSUER,
        audience: EMBED_AUTHENTICATION.audience,
        algorithms: ["ES256"],
      },
    );

    expect(payload).toMatchObject({
      sub: "clog1zezo04isul0nfes57hmo",
      preferred_username: "ind3x",
      // Not the `wiki;manage` the session also holds
      permissions: ["event;read"],
    });
    expect(new URL(resolvedUrl).searchParams.get("view")).toBe("all");
    expect(logWarn).not.toHaveBeenCalled();
  });

  test("leaves the URL of an app that did not opt in untouched", async () => {
    const resolveEmbedUrl = await importResolveEmbedUrl(
      generateBase64EncodedPrivateKeyPem(),
    );

    expect(
      await resolveEmbedUrl(EMBED_URL, buildSession(buildEntity("ind3x"))),
    ).toBe(EMBED_URL);
  });

  test("leaves the URL untouched when no signing key is configured", async () => {
    const resolveEmbedUrl = await importResolveEmbedUrl();

    expect(
      await resolveEmbedUrl(
        EMBED_URL,
        buildSession(buildEntity("ind3x")),
        EMBED_AUTHENTICATION,
      ),
    ).toBe(EMBED_URL);
  });

  test("renders the embed unauthenticated and warns without a linked entity", async () => {
    const resolveEmbedUrl = await importResolveEmbedUrl(
      generateBase64EncodedPrivateKeyPem(),
    );

    expect(
      await resolveEmbedUrl(
        EMBED_URL,
        buildSession(null),
        EMBED_AUTHENTICATION,
      ),
    ).toBe(EMBED_URL);
    expect(logWarn).toHaveBeenCalledOnce();
  });

  test("omits preferred_username for an entity without a handle", async () => {
    const base64EncodedPrivateKeyPem = generateBase64EncodedPrivateKeyPem();
    const resolveEmbedUrl = await importResolveEmbedUrl(
      base64EncodedPrivateKeyPem,
    );

    const resolvedUrl = await resolveEmbedUrl(
      EMBED_URL,
      buildSession(buildEntity(null)),
      EMBED_AUTHENTICATION,
    );

    const { payload } = await jwtVerify(
      new URL(resolvedUrl).searchParams.get("jwt")!,
      createLocalJWKSet(
        createEmbedJsonWebKeySet(
          await createEmbedSigningKey(base64EncodedPrivateKeyPem),
        ),
      ),
      { issuer: ISSUER, audience: EMBED_AUTHENTICATION.audience },
    );

    expect(payload).not.toHaveProperty("preferred_username");
  });
});
