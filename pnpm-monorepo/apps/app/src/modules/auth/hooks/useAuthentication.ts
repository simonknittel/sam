"use client";

import {
  comparePermissionSets,
  type PermissionSet,
} from "@sam-monorepo/permissions";
import { useSession } from "next-auth/react";

export const useAuthentication = () => {
  const { data: session } = useSession();

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

    const adminEnabled =
      typeof document !== "undefined" &&
      document.cookie
        .split(";")
        .some((cookie) => cookie.trim() === "enable_admin=1");

    if (session.user.role === "admin" && adminEnabled) return session;

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
