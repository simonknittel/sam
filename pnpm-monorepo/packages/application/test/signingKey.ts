import { exportJWK } from "jose";
import { generateKeyPairSync } from "node:crypto";
import { SIGNING_KEY_ALGORITHM, type SigningKey } from "../src/context.js";

/** A new ES256 key, like the signing key of the app */
export const createTestSigningKey = async (): Promise<SigningKey> => {
  const { privateKey, publicKey } = generateKeyPairSync("ec", {
    namedCurve: "P-256",
  });

  return {
    privateKey,
    publicJwk: await exportJWK(publicKey),
    keyId: "test-key",
    algorithm: SIGNING_KEY_ALGORITHM,
  };
};
