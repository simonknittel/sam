import { calculateJwkThumbprint, exportJWK, type JWK } from "jose";
import { createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";
import { EMBED_TOKEN_ALGORITHM } from "./constants";

export interface EmbedSigningKey {
  readonly privateKey: KeyObject;
  readonly publicJwk: JWK;
  /**
   * RFC 7638 thumbprint of the public JWK, derived from the key material so
   * that the `kid` of a token and the `kid` in the JWKS cannot drift apart.
   */
  readonly keyId: string;
}

export interface EmbedJsonWebKeySet {
  readonly keys: JWK[];
}

/**
 * The base64 wrapper around the PKCS#8 PEM exists so the value survives
 * single-line environment variable editors. A malformed key must fail loudly:
 * an unset variable already means that embed authentication is off.
 */
export const createEmbedSigningKey = async (
  base64EncodedPrivateKeyPem: string,
): Promise<EmbedSigningKey> => {
  const privateKeyPem = Buffer.from(
    base64EncodedPrivateKeyPem,
    "base64",
  ).toString("utf8");

  const privateKey = createPrivateKey(privateKeyPem);
  const publicKey = createPublicKey(privateKey);
  const publicJwk = await exportJWK(publicKey);

  if (publicJwk.kty !== "EC" || publicJwk.crv !== "P-256")
    throw new Error(
      `EMBED_JWT_PRIVATE_KEY must be an EC P-256 key for ${EMBED_TOKEN_ALGORITHM}`,
    );

  return {
    privateKey,
    publicJwk,
    keyId: await calculateJwkThumbprint(publicJwk),
  };
};

/**
 * Empty but structurally valid without a key: "this issuer currently publishes
 * no keys" is more useful to a verifier than an error.
 */
export const createEmbedJsonWebKeySet = (
  signingKey: EmbedSigningKey | null,
): EmbedJsonWebKeySet => {
  if (!signingKey) return { keys: [] };

  return {
    keys: [
      {
        ...signingKey.publicJwk,
        alg: EMBED_TOKEN_ALGORITHM,
        use: "sig",
        kid: signingKey.keyId,
      },
    ],
  };
};
