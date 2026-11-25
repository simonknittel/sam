/**
 * The shared base of the use cases of the Remote Control Program: the
 * errors, the permissions and the loaders of the effective access
 */
export {
  loadReadAccessOfViewer,
  loadReadAccessToOwner,
  type OwnerReadAccessInput,
  type ViewerReadAccess,
  type ViewerReadAccessInput,
  type WatchingCitizen,
} from "./loadReadAccess.js";
export { RemoteControlProgramErrorMessage } from "./remoteControlProgramErrors.js";
export {
  canUseRemoteControlProgram,
  requireRemoteControlProgramUse,
} from "./remoteControlProgramPermissions.js";
export {
  requireGrantedReadAccess,
  type GrantedReadAccess,
} from "./requireGrantedReadAccess.js";
