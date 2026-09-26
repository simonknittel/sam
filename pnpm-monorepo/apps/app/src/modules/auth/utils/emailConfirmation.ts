import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import { redirect } from "next/navigation";
import { isAdminModeActive } from "./isAdminModeActive";

export const requiresEmailConfirmation = async (session: Session) => {
  if (await isAdminModeActive(session)) return false;

  return true;
};

const requireConfirmedEmail = async (
  session: Session,
  logMessage: string,
  onUnconfirmedEmail: () => never,
) => {
  if (!(await requiresEmailConfirmation(session))) return;

  if (!session.user.emailVerified) {
    log.info(logMessage, {
      // TODO: Add request path/action name
      userId: session.user.id,
      reason: "Unconfirmed email",
    });

    onUnconfirmedEmail();
  }
};

export const requireConfirmedEmailForPage = (session: Session) =>
  requireConfirmedEmail(session, "Forbidden request to page", () =>
    redirect("/email-confirmation"),
  );

export const requireConfirmedEmailForApi = (session: Session) =>
  requireConfirmedEmail(session, "Forbidden request to API", () => {
    throw new Error("Forbidden");
  });

export const requireConfirmedEmailForAction = (session: Session) =>
  requireConfirmedEmail(session, "Forbidden request to action", () => {
    throw new Error("Forbidden");
  });

export const requireConfirmedEmailForTrpc = (session: Session) =>
  requireConfirmedEmail(session, "Forbidden request to tRPC", () => {
    throw new TRPCError({ code: "FORBIDDEN" });
  });
