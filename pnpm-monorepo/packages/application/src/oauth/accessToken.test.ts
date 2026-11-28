import { calculateJwkThumbprint, decodeJwt, exportJWK } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { describe, expect, test } from "vitest";
import {
  createApplicationUrls,
  type ApplicationContext,
  type SigningKey,
} from "../context.js";
import { issueAccessToken, verifyAccessToken } from "./accessToken.js";
import { getDesktopCompanionClientId } from "./desktopCompanionClient.js";
import { InvalidTokenError } from "./errors.js";
import { OAuthResource } from "./resources.js";

const GRANT = {
  id: "grant",
  userId: "user",
  clientId: "https://claude.ai/oauth/mcp-oauth-client-metadata",
  scope: "mcp",
};

/** A P-256 key like the key of `EMBED_JWT_PRIVATE_KEY` */
const createSigningKey = async (): Promise<SigningKey> => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const publicJwk = await exportJWK(publicKey);

  return {
    privateKey,
    publicJwk,
    keyId: await calculateJwkThumbprint(publicJwk),
    algorithm: "ES256",
  };
};

const createContext = (
  signingKey: SigningKey,
  baseUrl = "https://sam.example.com",
) =>
  ({
    urls: createApplicationUrls({ baseUrl, publicUploadBaseUrl: "" }),
    now: () => new Date(),
    signingKey: () => Promise.resolve(signingKey),
  }) as unknown as ApplicationContext;

describe("access tokens", () => {
  test("a signed token verifies with its claims", async () => {
    const context = createContext(await createSigningKey());
    const token = await issueAccessToken(context, GRANT);

    const verifiedToken = await verifyAccessToken(
      context,
      token,
      OAuthResource.Mcp,
    );

    expect(verifiedToken).toMatchObject({
      userId: GRANT.userId,
      grantId: GRANT.id,
      clientId: GRANT.clientId,
      scopes: ["mcp"],
    });
    expect(verifiedToken.resource.href).toBe("https://sam.example.com/api/mcp");
    expect(verifiedToken.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });

  test("gives each token of a grant its own jti", async () => {
    const context = createContext(await createSigningKey());

    const firstPayload = decodeJwt(await issueAccessToken(context, GRANT));
    const secondPayload = decodeJwt(await issueAccessToken(context, GRANT));

    expect(firstPayload.grant_id).toBe(GRANT.id);
    expect(secondPayload.grant_id).toBe(GRANT.id);
    expect(firstPayload.jti).not.toBe(secondPayload.jti);
  });

  test("gives the desktop companion a token for the Remote Control Program, which the MCP endpoint refuses", async () => {
    const context = createContext(await createSigningKey());
    const token = await issueAccessToken(context, {
      ...GRANT,
      clientId: getDesktopCompanionClientId(context),
      scope: "remote_control_program",
    });

    const verifiedToken = await verifyAccessToken(
      context,
      token,
      OAuthResource.RemoteControlProgram,
    );

    expect(verifiedToken.resource.href).toBe(
      "https://sam.example.com/api/remote-control-program",
    );
    await expect(
      verifyAccessToken(context, token, OAuthResource.Mcp),
    ).rejects.toThrow(InvalidTokenError);
  });

  test("refuses a token of a different resource or issuer", async () => {
    const signingKey = await createSigningKey();
    const token = await issueAccessToken(createContext(signingKey), GRANT);

    await expect(
      verifyAccessToken(
        createContext(signingKey),
        token,
        OAuthResource.RemoteControlProgram,
      ),
    ).rejects.toThrow(InvalidTokenError);

    await expect(
      verifyAccessToken(
        createContext(signingKey, "https://other.example.com"),
        token,
        OAuthResource.Mcp,
      ),
    ).rejects.toThrow(InvalidTokenError);
  });

  test("refuses a token of a different key", async () => {
    const token = await issueAccessToken(
      createContext(await createSigningKey()),
      GRANT,
    );

    await expect(
      verifyAccessToken(
        createContext(await createSigningKey()),
        token,
        OAuthResource.Mcp,
      ),
    ).rejects.toThrow(InvalidTokenError);
  });
});
