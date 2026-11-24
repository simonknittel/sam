import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 256 bits; RFC 6749 section 10.10 requires at least 128 bits */
const OPAQUE_TOKEN_BYTES = 32;

/** The database keeps only its hash (see `hashOpaqueToken()`) */
export const createOpaqueToken = () =>
  randomBytes(OPAQUE_TOKEN_BYTES).toString("base64url");

/**
 * The tokens have 256 random bits, thus a hash without a salt is sufficient
 * to find a token in the database and to make a copy of the database useless
 * for an attacker
 */
export const hashOpaqueToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** RFC 7636 section 4.6, method `S256` */
export const verifyCodeVerifier = (
  codeVerifier: string,
  codeChallenge: string,
) => {
  const computedChallenge = Buffer.from(
    createHash("sha256").update(codeVerifier).digest("base64url"),
  );
  const expectedChallenge = Buffer.from(codeChallenge);

  // `timingSafeEqual()` throws for buffers of different lengths
  return (
    computedChallenge.length === expectedChallenge.length &&
    timingSafeEqual(computedChallenge, expectedChallenge)
  );
};
