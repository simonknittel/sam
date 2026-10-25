import { log } from "@/modules/logging";
import { isMissingTwoFactorAuthentication } from "@sam-monorepo/domain";
import { TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import { redirect } from "next/navigation";

/**
 * Whether the session stops at the gate of the two-factor authentication.
 * During an assume, the session has the status of the admin, who always has
 * it (see `getAssumedUser()`).
 */
export const isMissingTwoFactorAuthenticationOfSession = (session: Session) =>
  isMissingTwoFactorAuthentication({
    userRole: session.user.role,
    permissionSets: session.givenPermissionSets,
    discordTwoFactorEnabled: session.discordTwoFactorEnabled,
  });

const requireTwoFactorAuthentication = (
  session: Session,
  logMessage: string,
  onMissingTwoFactorAuthentication: () => never,
) => {
  if (!isMissingTwoFactorAuthenticationOfSession(session)) return;

  log.info(logMessage, {
    userId: session.user.id,
    reason: "Missing two-factor authentication",
  });

  onMissingTwoFactorAuthentication();
};

export const requireTwoFactorAuthenticationForPage = (session: Session) =>
  requireTwoFactorAuthentication(session, "Forbidden request to page", () =>
    redirect("/two-factor-authentication"),
  );

export const requireTwoFactorAuthenticationForApi = (session: Session) =>
  requireTwoFactorAuthentication(session, "Forbidden request to API", () => {
    throw new Error("Forbidden");
  });

export const requireTwoFactorAuthenticationForTrpc = (session: Session) =>
  requireTwoFactorAuthentication(session, "Forbidden request to tRPC", () => {
    throw new TRPCError({ code: "FORBIDDEN" });
  });
