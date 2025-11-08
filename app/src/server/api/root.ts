import { aiRouter } from "./routers/ai";
import { citizensRouter } from "./routers/citizens";
import { entityLogRouter } from "./routers/entityLog";
import { eventsRouter } from "./routers/events";
import { manufacturerRouter } from "./routers/manufacturer";
import { rolesRouter } from "./routers/roles";
import { silcRouter } from "./routers/silc";
import { variantRouter } from "./routers/variant";
import { createCallerFactory, createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  ai: aiRouter,
  citizens: citizensRouter,
  entityLog: entityLogRouter,
  events: eventsRouter,
  manufacturer: manufacturerRouter,
  roles: rolesRouter,
  silc: silcRouter,
  variant: variantRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
