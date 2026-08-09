import { getRoleNameSuggestions } from "./routers/ai/getRoleNameSuggestions";
import { getAllCitizens } from "./routers/citizens/getAllCitizens";
import { getCitizenById } from "./routers/citizens/getCitizenById";
import { getCitizensGroupedByVisibleRoles } from "./routers/citizens/getCitizensGroupedByVisibleRoles";
import { getHistory } from "./routers/entityLog/getHistory";
import { getAllEvents } from "./routers/events/getAllEvents";
import { getAllManufacturers } from "./routers/manufacturer/getAll";
import { getManufacturerById } from "./routers/manufacturer/getById";
import { getSeriesByManufacturerId } from "./routers/manufacturer/getSeriesByManufacturerId";
import { list as listOnSiteNotifications } from "./routers/onSiteNotifications/list";
import { getAssignableRoles } from "./routers/roles/getAssignableRoles";
import { getVisibleRoles } from "./routers/roles/getVisibleRoles";
import { getRolesForSalaries } from "./routers/silc/getRolesForSalaries";
import { getAssumableUsers } from "./routers/users/getAssumableUsers";
import { getAll as getAllVariants } from "./routers/variant/getAll";
import { getById as getVariantById } from "./routers/variant/getById";
import { getPageDetails } from "./routers/wiki/getPageDetails";
import { getPageIndex } from "./routers/wiki/getPageIndex";
import { getPageTargets } from "./routers/wiki/getPageTargets";
import { getRoleCitizens } from "./routers/wiki/getRoleCitizens";
import { getTags } from "./routers/wiki/getTags";
import { search } from "./routers/wiki/search";
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
  onSiteNotifications: createTRPCRouter({
    list: listOnSiteNotifications,
  }),
  roles: createTRPCRouter({
    getVisibleRoles,
    getAssignableRoles,
  }),
  silc: createTRPCRouter({
    getRolesForSalaries,
  }),
  users: createTRPCRouter({
    getAssumableUsers,
  }),
  variant: createTRPCRouter({
    getAll: getAllVariants,
    getById: getVariantById,
  }),
  wiki: createTRPCRouter({
    getPageDetails,
    getPageIndex,
    getPageTargets,
    getRoleCitizens,
    getTags,
    search,
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
