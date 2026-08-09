/**
 * Pure permission logic shared between the Next.js app and the Lambdas:
 * the permission-set vocabulary, role → permission-set resolution and the
 * wiki/event page permission resolvers. Everything here is session-free and
 * side-effect-free — the consumers load the data (session, role
 * assignments, pages) and pass it in.
 */
export { comparePermissionSets } from "./comparePermissionSets.js";
export { getPermissionSetsByRoles } from "./getPermissionSetsByRoles.js";
export type {
  GenericEntityLogType,
  PermissionSet,
  PermissionSetAttribute,
} from "./PermissionSet.js";
export { resolveEffectiveRoles } from "./resolveEffectiveRoles.js";
export {
  collectPositionScopeIdsForCitizen,
  createEventWikiPagePermissionResolver,
  resolveEventWikiPagePermissions,
  type EventWikiPagePermissionSource,
  type EventWikiViewer,
  type ResolvedEventWikiPagePermissions,
} from "./resolveEventWikiPagePermissions.js";
export {
  createWikiPagePermissionResolver,
  resolveWikiPagePermissions,
  type ResolvedWikiPagePermissions,
  type WikiPagePermissionSource,
  type WikiPageTierPermissions,
  type WikiPageViewer,
} from "./resolveWikiPagePermissions.js";
export {
  createWikiPageRoleResolvers,
  resolveWikiPageReadRoleIds,
  resolveWikiPageRolePermissions,
  type WikiPermissionRole,
} from "./resolveWikiPageRolePermissions.js";
export { transformPermissionStringToPermissionSet } from "./transformPermissionStringToPermissionSet.js";
export {
  findWikiPageSettingSource,
  resolveWikiPageTier,
} from "./wikiPageHierarchy.js";
