import { env } from "@/env";

/**
 * Editing requires the collab server — without it (e.g. a preview
 * deployment missing the env vars) pages are read-only. Also used by the
 * page headers to decide whether to offer the edit-mode toggle.
 */
export const getWikiCollabUrl = () =>
  env.COLLAB_JWT_SECRET && env.COLLAB_URL ? env.COLLAB_URL : null;
