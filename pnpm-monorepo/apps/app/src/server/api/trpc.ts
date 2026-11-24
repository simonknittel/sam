import { authorize, getServerAuthSession } from "@/modules/auth/server";
import { requireConfirmedEmailForTrpc } from "@/modules/auth/utils/emailConfirmation";
import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { requireTwoFactorAuthenticationForTrpc } from "@/modules/auth/utils/twoFactorAuthentication";
import { log } from "@/modules/logging";
import { ForbiddenError } from "@sam-monorepo/application";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getServerAuthSession();

  return {
    session,
    ...opts,
  };
};

const trpc = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createCallerFactory = trpc.createCallerFactory;

export const createTRPCRouter = trpc.router;

export const protectedProcedure = trpc.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  await requireConfirmedEmailForTrpc(ctx.session);

  // The same clearance gate as the pages, the API routes and the actions
  if (!(await authorize(ctx.session, "login", "manage")))
    throw new TRPCError({ code: "FORBIDDEN" });

  requireTwoFactorAuthenticationForTrpc(ctx.session);

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/**
 * Procedure of the admin toolbar, the tRPC counterpart of
 * `ActionGate.Admin`: only an admin can call it, also while they assume a
 * different user. It skips the confirmed-email and clearance gates, because
 * the toolbar shows on the pages of these gates and an assumed user can be
 * without clearance.
 */
export const adminProcedure = trpc.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!isAdminBehindSession(ctx.session))
    throw new TRPCError({ code: "FORBIDDEN" });

  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

/** A procedure with a different answer for a typed error checks it before */
export const toTrpcError = (error: unknown, message: string): TRPCError => {
  if (error instanceof TRPCError) return error;

  if (error instanceof ForbiddenError)
    return new TRPCError({ code: "FORBIDDEN", message: error.message });

  log.error(message, {
    error,
  });

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message,
  });
};
