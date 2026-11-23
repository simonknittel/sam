import {
  KeySetUnavailableError,
  SIGNING_KEY_ALGORITHM,
} from "@sam-monorepo/application";
import { errors, exportJWK } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { expect, test } from "vitest";
import {
  RelayInternalOperation,
  RelayInternalRequestTokenError,
  signRelayInternalRequestToken,
  verifyRelayInternalRequestToken,
} from "./relayInternalRequestToken.js";

const ISSUER = "https://sam.example.com";

test("a token is valid only for the endpoint of its operation, and a key set that cannot be read is an error of the host", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });
  const token = await signRelayInternalRequestToken({
    signingKey: {
      privateKey,
      publicJwk: await exportJWK(publicKey),
      keyId: "test-key",
      algorithm: SIGNING_KEY_ALGORITHM,
    },
    issuer: ISSUER,
    request: {
      operation: RelayInternalOperation.DisconnectUser,
      userId: "user-1",
    },
  });
  const verify = (
    operation: RelayInternalOperation,
    key: () => Promise<typeof publicKey> = async () => publicKey,
  ) =>
    verifyRelayInternalRequestToken({ token, key, issuer: ISSUER, operation });

  await expect(verify(RelayInternalOperation.DisconnectUser)).resolves.toEqual({
    operation: RelayInternalOperation.DisconnectUser,
    userId: "user-1",
  });
  await expect(verify(RelayInternalOperation.OwnerStopChanged)).rejects.toThrow(
    RelayInternalRequestTokenError,
  );

  // Like the remote key set of `jose` after a timeout
  await expect(
    verify(RelayInternalOperation.DisconnectUser, async () => {
      throw new errors.JWKSTimeout();
    }),
  ).rejects.toThrow(KeySetUnavailableError);
});
