import {
  createEmbedJsonWebKeySet,
  type EmbedJsonWebKeySet,
} from "@/modules/embed-authentication/utils/embedSigningKey";
import { getEmbedSigningKey } from "@/modules/embed-authentication/utils/getEmbedSigningKey";

/**
 * Long enough to spare verifiers a fetch per token, short enough that a key
 * rotation (one deploy with the new key) propagates soon.
 */
const CACHE_MAX_AGE_IN_SECONDS = 5 * 60;

/**
 * The MCP access tokens use the same key as the embeds (see
 * docs/embedded-app-authentication.md). Public by design: the key set holds
 * only public keys.
 */
export const GET = async () => {
  const jsonWebKeySet: EmbedJsonWebKeySet = createEmbedJsonWebKeySet(
    await getEmbedSigningKey(),
  );

  return Response.json(jsonWebKeySet, {
    headers: {
      // RFC 7517 registers this type for a key set
      "Content-Type": "application/jwk-set+json",
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_IN_SECONDS}, s-maxage=${CACHE_MAX_AGE_IN_SECONDS}`,
      // Verification may happen in the browser of an embedded app
      "Access-Control-Allow-Origin": "*",
    },
  });
};
