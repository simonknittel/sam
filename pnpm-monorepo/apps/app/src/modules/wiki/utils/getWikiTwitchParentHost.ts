import { env } from "@/env";

/**
 * Twitch's player requires the embedding site's hostname (without port) as
 * its `parent` query parameter. Derived from the runtime host so stored
 * documents stay host-independent.
 */
export const getWikiTwitchParentHost = () =>
  new URL(`https://${env.NEXT_PUBLIC_HOST}`).hostname;
