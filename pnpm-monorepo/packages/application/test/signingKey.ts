import { exportJWK } from "jose";
import { generateKeyPairSync } from "node:crypto";
import type { SigningKey } from "../src/context.js";

/** A new ES256 key, like the signing key of the app */
export const createTestSigningKey = async (
  keyId = "test-key",
): Promise<SigningKey> => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  return {
    privateKey,
    publicJwk: await exportJWK(publicKey),
    keyId,
    algorithm: "ES256",
  };
};
