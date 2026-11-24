import { env } from "@/env";

/**
 * Without the collab server (for example a preview deployment without the env
 * vars) the pages are read-only
 */
export const getWikiCollabUrl = () =>
  env.COLLAB_JWT_SECRET && env.COLLAB_URL ? env.COLLAB_URL : null;
