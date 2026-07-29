import { getRoleNameSuggestions } from "./routers/ai/getRoleNameSuggestions";
import { getAllCitizens } from "./routers/citizens/getAllCitizens";
import { getCitizenById } from "./routers/citizens/getCitizenById";
import { getCitizensGroupedByVisibleRoles } from "./routers/citizens/getCitizensGroupedByVisibleRoles";
import { getHistory } from "./routers/entityLog/getHistory";
import { getAllEvents } from "./routers/events/getAllEvents";
import { getAllManufacturers } from "./routers/manufacturer/getAll";
import { getManufacturerById } from "./routers/manufacturer/getById";
import { getSeriesByManufacturerId } from "./routers/manufacturer/getSeriesByManufacturerId";
import { getAssignableRoles } from "./routers/roles/getAssignableRoles";
import { getVisibleRoles } from "./routers/roles/getVisibleRoles";
import { getRolesForSalaries } from "./routers/silc/getRolesForSalaries";
import { getById as getVariantById } from "./routers/variant/getById";
import { getPageTargets } from "./routers/wiki/getPageTargets";
import { searchPages } from "./routers/wiki/searchPages";
import { createCallerFactory, createTRPCRouter } from "./trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  ai: createTRPCRouter({
    getRoleNameSuggestions,
  }),
  citizens: createTRPCRouter({
    getAllCitizens,
    getCitizenById,
    getCitizensGroupedByVisibleRoles,
  }),
  entityLog: createTRPCRouter({
    getHistory,
  }),
  events: createTRPCRouter({
    getAllEvents,
  }),
  manufacturer: createTRPCRouter({
    getAll: getAllManufacturers,
    getById: getManufacturerById,
    getSeriesByManufacturerId,
  }),
  roles: createTRPCRouter({
    getVisibleRoles,
    getAssignableRoles,
  }),
  silc: createTRPCRouter({
    getRolesForSalaries,
  }),
  variant: createTRPCRouter({
    getById: getVariantById,
  }),
  wiki: createTRPCRouter({
    getPageTargets,
    searchPages,
  }),
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
