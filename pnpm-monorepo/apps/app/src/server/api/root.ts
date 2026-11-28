import { getRoleNameSuggestions } from "./routers/ai/getRoleNameSuggestions";
import { getHistory } from "./routers/citizenLog/getHistory";
import { getAllCitizens } from "./routers/citizens/getAllCitizens";
import { getCitizenById } from "./routers/citizens/getCitizenById";
import { getCitizensGroupedByVisibleRoles } from "./routers/citizens/getCitizensGroupedByVisibleRoles";
import { getAddableParticipants } from "./routers/events/getAddableParticipants";
import { getAllEvents } from "./routers/events/getAllEvents";
import { getOwnInvitationState } from "./routers/events/getOwnInvitationState";
import { getPublishableDiscordChannels } from "./routers/events/getPublishableDiscordChannels";
import { getUsableEventTemplates } from "./routers/events/getUsableEventTemplates";
import { getManufacturerById } from "./routers/manufacturer/getById";
import { getSeriesByManufacturerId } from "./routers/manufacturer/getSeriesByManufacturerId";
import { list as listOnSiteNotifications } from "./routers/onSiteNotifications/list";
import { unreadCount as countUnreadOnSiteNotifications } from "./routers/onSiteNotifications/unreadCount";
import { endWatchLease } from "./routers/remoteControlProgram/endWatchLease";
import { getSharingPopover } from "./routers/remoteControlProgram/getSharingPopover";
import { listOwnRuntimes } from "./routers/remoteControlProgram/listOwnRuntimes";
import { listSharingOwners } from "./routers/remoteControlProgram/listSharingOwners";
import { readFeedEntries } from "./routers/remoteControlProgram/readFeedEntries";
import { renewWatchLease } from "./routers/remoteControlProgram/renewWatchLease";
import { getAssignableRoles } from "./routers/roles/getAssignableRoles";
import { getRolesForSalaries } from "./routers/silc/getRolesForSalaries";
import { search as searchSpynet } from "./routers/spynet/search";
import { getAssumableUsers } from "./routers/users/getAssumableUsers";
import { getAll as getAllVariants } from "./routers/variant/getAll";
import { getById as getVariantById } from "./routers/variant/getById";
import { getDetailById as getVariantDetailById } from "./routers/variant/getDetailById";
import { getLinkablePages } from "./routers/wiki/getLinkablePages";
import { getPageDetails } from "./routers/wiki/getPageDetails";
import { getPageIndex } from "./routers/wiki/getPageIndex";
import { getPageTargets } from "./routers/wiki/getPageTargets";
import { getRoleCitizens } from "./routers/wiki/getRoleCitizens";
import { getTags } from "./routers/wiki/getTags";
import { search } from "./routers/wiki/search";
import { createCallerFactory, createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  ai: createTRPCRouter({
    getRoleNameSuggestions,
  }),
  citizens: createTRPCRouter({
    getAllCitizens,
    getCitizenById,
    getCitizensGroupedByVisibleRoles,
  }),
  citizenLog: createTRPCRouter({
    getHistory,
  }),
  events: createTRPCRouter({
    getAddableParticipants,
    getAllEvents,
    getOwnInvitationState,
    getPublishableDiscordChannels,
    getUsableEventTemplates,
  }),
  manufacturer: createTRPCRouter({
    getById: getManufacturerById,
    getSeriesByManufacturerId,
  }),
  onSiteNotifications: createTRPCRouter({
    list: listOnSiteNotifications,
    unreadCount: countUnreadOnSiteNotifications,
  }),
  remoteControlProgram: createTRPCRouter({
    endWatchLease,
    getSharingPopover,
    listOwnRuntimes,
    listSharingOwners,
    readFeedEntries,
    renewWatchLease,
  }),
  roles: createTRPCRouter({
    getAssignableRoles,
  }),
  silc: createTRPCRouter({
    getRolesForSalaries,
  }),
  spynet: createTRPCRouter({
    search: searchSpynet,
  }),
  users: createTRPCRouter({
    getAssumableUsers,
  }),
  variant: createTRPCRouter({
    getAll: getAllVariants,
    getById: getVariantById,
    getDetailById: getVariantDetailById,
  }),
  wiki: createTRPCRouter({
    getLinkablePages,
    getPageDetails,
    getPageIndex,
    getPageTargets,
    getRoleCitizens,
    getTags,
    search,
  }),
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
