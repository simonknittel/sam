import type { Profile } from "next-auth";

/**
 * Null when the profile does not have a valid status. The scope `identify`
 * gives `mfa_enabled`.
 */
export const getDiscordTwoFactorEnabled = (profile: Profile) =>
  "mfa_enabled" in profile && typeof profile.mfa_enabled === "boolean"
    ? profile.mfa_enabled
    : null;
