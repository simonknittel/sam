import { prisma } from "@/db";
import { env } from "@/env";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { log } from "@/modules/logging";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { type Session } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUnleashFlag } from "../../common/utils/getUnleashFlag";
import { sendEmail } from "../../common/utils/sendEmail";

export const requestEmailConfirmation = async (
  userId: string,
  userEmail: string,
) => {
  if (await getUnleashFlag(UNLEASH_FLAG.DisableConfirmationEmail)) return;

  const emailConfirmationToken = createId();

  await prisma.emailConfirmationToken.create({
    data: {
      token: emailConfirmationToken,
      email: userEmail,
      userId,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    },
  });

  await sendEmail("emailConfirmation", [
    {
      to: userEmail,
      templateProps: {
        baseUrl: env.BASE_URL,
        host: env.HOST,
        token: emailConfirmationToken,
      },
    },
  ]);
};

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
    void log.info("Forbidden request to page", {
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
    void log.info("Forbidden request to API", {
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
    void log.info("Forbidden request to action", {
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
    void log.info("Forbidden request to tRPC", {
      userId: session.user.id,
      reason: "Unconfirmed email",
    });
    throw new TRPCError({ code: "FORBIDDEN" });
  }
};
