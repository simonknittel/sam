"use client";

import {
  comparePermissionSets,
  type PermissionSet,
} from "@sam-monorepo/permissions";
import { useSession } from "next-auth/react";
import { useContext } from "react";
import { AdminModeContext } from "./AdminModeContext";

export const useAuthentication = () => {
  const { data: session } = useSession();
  const adminModeActive = useContext(AdminModeContext);

  /**
   * Authenticate
   */
  if (!session) return false;

  /**
   * Authorize
   */
  function authorize(
    resource: PermissionSet["resource"],
    operation: PermissionSet["operation"],
    attributes?: PermissionSet["attributes"],
  ) {
    if (!session) return false;

    // Same rule as `authorize` on the server
    if (adminModeActive) return operation === "negate" ? false : session;

    const result = comparePermissionSets(
      {
        resource,
        operation,
        attributes,
      },
      session.givenPermissionSets,
    );

    if (!result) return false;

    return session;
  }

  return { session, authorize };
};
