import { env } from "@/env";
import "server-only";
import { createEmbedSigningKey, type EmbedSigningKey } from "./embedSigningKey";

/**
 * The key cannot change without a redeploy, so decoding, importing and
 * hashing it happens once per process. A rejected promise stays cached on
 * purpose: a malformed key is a deployment error and must keep failing
 * rather than be retried on every render.
 */
let signingKey: Promise<EmbedSigningKey | null> | undefined;

export const getEmbedSigningKey = () => {
  signingKey ??= env.EMBED_JWT_PRIVATE_KEY
    ? createEmbedSigningKey(env.EMBED_JWT_PRIVATE_KEY)
    : Promise.resolve(null);

  return signingKey;
};
