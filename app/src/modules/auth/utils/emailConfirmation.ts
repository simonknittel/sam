import { log } from "@/modules/logging";
import { TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const requiresEmailConfirmation = async (session: Session) => {
  if (
    session.user.role === "admin" &&
    (await cookies()).get("enable_admin")?.value === "1"
  )
    return false;

  return true;
};

export const requireConfirmedEmailForPage = async (session: Session) => {
  if (!(await requiresEmailConfirmation(session))) return;

  if (!session.user.emailVerified) {
    log.info("Forbidden request to page", {
      // TODO: Add request path
      userId: session.user.id,
      reason: "Unconfirmed email",
    });

    redirect("/email-confirmation");
  }
};

export const requireConfirmedEmailForApi = async (session: Session) => {
  if (!(await requiresEmailConfirmation(session))) return;

  if (!session.user.emailVerified) {
    log.info("Forbidden request to API", {
      // TODO: Add request path
      userId: session.user.id,
      reason: "Unconfirmed email",
    });

    throw new Error("Forbidden");
  }
};

export const requireConfirmedEmailForAction = async (session: Session) => {
  if (!(await requiresEmailConfirmation(session))) return;

  if (!session.user.emailVerified) {
    log.info("Forbidden request to action", {
      // TODO: Add action name
      userId: session.user.id,
      reason: "Unconfirmed email",
    });

    throw new Error("Forbidden");
  }
};

export const requireConfirmedEmailForTrpc = async (session: Session) => {
  if (!(await requiresEmailConfirmation(session))) return;

  if (!session.user.emailVerified) {
    log.info("Forbidden request to tRPC", {
      userId: session.user.id,
      reason: "Unconfirmed email",
    });
    throw new TRPCError({ code: "FORBIDDEN" });
  }
};
