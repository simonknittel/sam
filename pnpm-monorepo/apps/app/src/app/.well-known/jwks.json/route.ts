import {
  createEmbedJsonWebKeySet,
  type EmbedJsonWebKeySet,
} from "@/modules/embed-authentication/utils/embedSigningKey";
import { getEmbedSigningKey } from "@/modules/embed-authentication/utils/getEmbedSigningKey";

/** The key set is read from the environment at request time, never prerendered. */
export const dynamic = "force-dynamic";

/**
 * Long enough to spare verifiers a fetch per token, short enough that a key
 * rotation (deploy the new key, retire the old one in a second deploy)
 * propagates well within one deployment cycle.
 */
const CACHE_MAX_AGE_IN_SECONDS = 5 * 60;

/**
 * Publishes the public key embedded apps verify their identity tokens with
 * (see docs/embedded-app-authentication.md). Public by design — this is the
 * one endpoint that must be reachable without a session.
 */
export const GET = async () => {
  const jsonWebKeySet: EmbedJsonWebKeySet = createEmbedJsonWebKeySet(
    await getEmbedSigningKey(),
  );

  return Response.json(jsonWebKeySet, {
    headers: {
      // RFC 7517 registers this type for a key set
      "Content-Type": "application/jwk-set+json",
      // s-maxage lets the CDN answer repeat fetches without a function invocation
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_IN_SECONDS}, s-maxage=${CACHE_MAX_AGE_IN_SECONDS}`,
      // Verification may happen in the browser of an embedded app
      "Access-Control-Allow-Origin": "*",
    },
  });
};
