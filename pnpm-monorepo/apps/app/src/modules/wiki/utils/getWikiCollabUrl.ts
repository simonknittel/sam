import { env } from "@/env";

/**
 * Editing requires the collab server — without it (e.g. a preview
 * deployment missing the env vars) pages are read-only. Also used by the
 * page headers to decide whether to offer the edit-mode toggle.
 */
export const getWikiCollabUrl = () => {
  const collabUrl = env.COLLAB_URL ?? env.NEXT_PUBLIC_COLLAB_URL;
  return env.COLLAB_JWT_SECRET && collabUrl ? collabUrl : null;
};
