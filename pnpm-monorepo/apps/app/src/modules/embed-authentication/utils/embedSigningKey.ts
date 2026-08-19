import { calculateJwkThumbprint, exportJWK, type JWK } from "jose";
import { createPrivateKey, createPublicKey, type KeyObject } from "node:crypto";
import { EMBED_TOKEN_ALGORITHM } from "./constants";

export interface EmbedSigningKey {
  /** Signs the tokens; never leaves the server. */
  readonly privateKey: KeyObject;
  /** Published via /.well-known/jwks.json so embedded apps can verify. */
  readonly publicJwk: JWK;
  /**
   * RFC 7638 thumbprint of the public JWK. Computing it from the key
   * material rather than configuring it separately is what keeps the `kid`
   * of a token and the `kid` in the JWKS from drifting apart: the
   * thumbprint covers only the public members (`crv`, `kty`, `x`, `y`), so
   * both sides derive the same value from the same key by construction.
   */
  readonly keyId: string;
}

export interface EmbedJsonWebKeySet {
  readonly keys: JWK[];
}

/**
 * Imports the configured signing key. The base64 wrapper around the PKCS#8
 * PEM exists so the value survives single-line environment variable
 * editors. Throws on anything that isn't an EC P-256 private key — a
 * malformed key must fail loudly instead of silently disabling embed
 * authentication, which is what an unset variable already means.
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
 * The document served at /.well-known/jwks.json. Without a configured key
 * it is empty but structurally valid — "this issuer currently publishes no
 * keys" is more useful to a verifier than an error.
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
