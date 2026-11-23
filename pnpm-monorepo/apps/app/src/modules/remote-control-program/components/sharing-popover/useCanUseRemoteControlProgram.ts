"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import {
  comparePermissionSets,
  type PermissionSet,
} from "@sam-monorepo/domain";

/**
 * `REMOTE_CONTROL_PROGRAM_USE_PERMISSION_SET` of the use cases. The browser
 * cannot load the `application` package.
 */
const USE_PERMISSION_SET = {
  resource: "remoteControlProgram",
  operation: "use",
} as const satisfies PermissionSet;

/**
 * The rule of `canUseRemoteControlProgram()` for the session in the browser:
 * a citizen and `remoteControlProgram;use` (admin mode does not give it),
 * and not for an admin who assumes the user. The mobile action
 * bar is a client component without a server loader of its own, thus the
 * items of the shell use this rule. The use cases check the rule again.
 */
export const useCanUseRemoteControlProgram = () => {
  const authentication = useAuthentication();
  if (!authentication) return false;

  const { session } = authentication;

  return (
    !session.assumedByAdminId &&
    Boolean(session.entity) &&
    comparePermissionSets(USE_PERMISSION_SET, session.givenPermissionSets)
  );
};
