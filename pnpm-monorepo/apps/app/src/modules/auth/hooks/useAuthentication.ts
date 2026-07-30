"use client";

import { useSession } from "next-auth/react";
import { type PermissionSet } from "../PermissionSet";
import comparePermissionSets from "../comparePermissionSets";

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

    const enable_admin =
      typeof document !== "undefined"
        ? document.cookie.includes("enable_admin=1")
        : false;

    if (session.user.role === "admin" && enable_admin) return session;

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
