/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { authorize, getServerAuthSession } from "@/modules/auth/server";
import { requireConfirmedEmailForTrpc } from "@/modules/auth/utils/emailConfirmation";
import { isAdminBehindSession } from "@/modules/auth/utils/isAdminBehindSession";
import { requireTwoFactorAuthenticationForTrpc } from "@/modules/auth/utils/twoFactorAuthentication";
import { log } from "@/modules/logging";
import { ForbiddenError } from "@sam-monorepo/application";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the session. The procedures
 * call the use cases of `@sam-monorepo/application` for the data.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await getServerAuthSession();

  return {
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer.
 */
const trpc = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = trpc.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = trpc.router;

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
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
      // infers the `session` as non-nullable
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

/**
 * Shared catch-block tail for procedures: deliberate TRPCErrors pass
 * through untouched, the `ForbiddenError` of a use case becomes FORBIDDEN
 * with its message, anything else is logged and replaced with an opaque
 * INTERNAL_SERVER_ERROR carrying the given message. A procedure with a
 * different answer for a typed error checks it before. Usage:
 * `throw toTrpcError(error, "...")`.
 */
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
