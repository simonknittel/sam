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
} from "./loadReadAccess.js";
export { RemoteControlProgramErrorMessage } from "./remoteControlProgramErrors.js";
export {
  REMOTE_CONTROL_PROGRAM_USE_PERMISSION_SET,
  canUseRemoteControlProgram,
  getConsumerPermissionSet,
  requireRemoteControlProgramUse,
} from "./remoteControlProgramPermissions.js";
export {
  requireGrantedReadAccess,
  type GrantedReadAccess,
} from "./requireGrantedReadAccess.js";
