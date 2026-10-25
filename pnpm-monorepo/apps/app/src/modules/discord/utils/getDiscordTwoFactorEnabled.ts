import type { Profile } from "next-auth";

/**
 * The status of the two-factor authentication in the profile of a Discord
 * login (the scope `identify` gives `mfa_enabled`). Null when the profile
 * does not have a valid status.
 */
export const getDiscordTwoFactorEnabled = (profile: Profile) =>
  "mfa_enabled" in profile && typeof profile.mfa_enabled === "boolean"
    ? profile.mfa_enabled
    : null;
