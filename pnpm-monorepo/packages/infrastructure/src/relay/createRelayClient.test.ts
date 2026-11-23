import type { SigningKey } from "@sam-monorepo/application";
import { exportJWK } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createRelayClient } from "./createRelayClient.js";
import {
  RelayInternalOperation,
  RelayInternalRequestTokenError,
  verifyRelayInternalRequestToken,
} from "./relayInternalRequestToken.js";

const ISSUER = "https://sam.example.com";
const REQUEST_TIMEOUT_MILLISECONDS = 5_000;

const fetchMock = vi.fn<typeof fetch>();

const { privateKey, publicKey } = generateKeyPairSync("ec", {
  namedCurve: "P-256",
});
const SIGNING_KEY: SigningKey = {
  privateKey,
  publicJwk: await exportJWK(publicKey),
  keyId: "test-key",
  algorithm: "ES256",
};

const createClient = (
  url = "ws://relay.example:1234",
  signingKey: SigningKey | null = SIGNING_KEY,
) =>
  createRelayClient({
    url,
    signingKey: async () => signingKey,
    issuer: ISSUER,
    requestTimeoutMilliseconds: REQUEST_TIMEOUT_MILLISECONDS,
  });

const getRequest = () => {
  const [input, init] = fetchMock.mock.calls[0] ?? [];
  const headers = new Headers(init?.headers);

  return {
    url: String(input),
    method: init?.method,
    token: headers.get("authorization")?.replace(/^Bearer /, "") ?? "",
    signal: init?.signal,
  };
};

/** Like an endpoint of the relay service */
const verify = (token: string, operation: RelayInternalOperation) =>
  verifyRelayInternalRequestToken({
    token,
    key: async () => publicKey,
    issuer: ISSUER,
    operation,
  });

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => new Response(null));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("sends each request with a token that only the endpoint of its operation accepts", async () => {
  await createClient().disconnectUser("user-1");

  const disconnect = getRequest();
  expect(disconnect).toMatchObject({
    url: "http://relay.example:1234/internal/disconnect-user",
    method: "POST",
    signal: expect.any(AbortSignal),
  });
  await expect(
    verify(disconnect.token, RelayInternalOperation.DisconnectUser),
  ).resolves.toEqual({
    operation: RelayInternalOperation.DisconnectUser,
    userId: "user-1",
  });
  await expect(
    verify(disconnect.token, RelayInternalOperation.OwnerStopChanged),
  ).rejects.toThrow(RelayInternalRequestTokenError);

  fetchMock.mockClear();
  await createClient("wss://relay.example").notifyOwnerStopChanged("citizen-1");

  const ownerStop = getRequest();
  expect(ownerStop.url).toBe(
    "https://relay.example/internal/owner-stop-changed",
  );
  await expect(
    verify(ownerStop.token, RelayInternalOperation.OwnerStopChanged),
  ).resolves.toEqual({
    operation: RelayInternalOperation.OwnerStopChanged,
    ownerCitizenId: "citizen-1",
  });
});

test("throws when the relay service refuses the request or the app has no signing key", async () => {
  fetchMock.mockImplementation(async () => new Response(null, { status: 401 }));

  await expect(createClient().disconnectUser("user-1")).rejects.toThrow(
    "status 401",
  );

  fetchMock.mockClear();
  await expect(
    createClient(undefined, null).disconnectUser("user-1"),
  ).rejects.toThrow("no signing key");
  expect(fetchMock).not.toHaveBeenCalled();
});
