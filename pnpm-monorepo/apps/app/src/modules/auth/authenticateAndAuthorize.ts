import { authOptions } from "@/modules/auth/server/auth";
import {
  requireConfirmedEmailForAction,
  requireConfirmedEmailForApi,
  requireConfirmedEmailForPage,
} from "@/modules/auth/utils/emailConfirmation";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { getServerSession, type Session } from "next-auth";
import { cookies } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { type PermissionSet } from "./PermissionSet";
import comparePermissionSets from "./comparePermissionSets";

export const authenticate = cache(
  withTrace("authenticate", async () => {
    const session = await getServerSession(authOptions);
    if (!session) return false;

    return {
      session,
      authorize: (
        resource: PermissionSet["resource"],
        operation: PermissionSet["operation"],
        attributes?: PermissionSet["attributes"],
      ) => authorize(session, resource, operation, attributes),
    };
  }),
);

export async function requireAuthenticationPage(requestPath?: string) {
  const authentication = await authenticate();

  if (!authentication) {
    log.info("Unauthorized request to page", {
      requestPath,
      reason: "No session",
    });

    redirect("/");
  }

  await requireConfirmedEmailForPage(authentication.session);

  if (!(await authentication.authorize("login", "manage")))
    redirect("/clearance");

  return {
    ...authentication,
    authorizePage: async (
      resource: PermissionSet["resource"],
      operation: PermissionSet["operation"],
      attributes?: PermissionSet["attributes"],
    ) => {
      const result = await authentication.authorize(
        resource,
        operation,
        attributes,
      );

      if (!result) {
        log.info("Forbidden request to page", {
          requestPath,
          userId: authentication.session.user.id,
          reason: "Insufficient permissions",
        });

        forbidden();
      }

      return result;
    },
  };
}

export async function requireAuthenticationApi(
  requestPath?: string,
  requestMethod?: string,
) {
  const authentication = await authenticate();

  if (!authentication) {
    log.info("Unauthorized request to API", {
      requestPath,
      requestMethod,
      reason: "No session",
    });

    throw new Error("Unauthorized");
  }

  await requireConfirmedEmailForApi(authentication.session);

  if (!(await authentication.authorize("login", "manage")))
    throw new Error("Forbidden");

  return {
    ...authentication,
    authorizeApi: async (
      resource: PermissionSet["resource"],
      operation: PermissionSet["operation"],
      attributes?: PermissionSet["attributes"],
    ) => {
      const result = await authentication.authorize(
        resource,
        operation,
        attributes,
      );

      if (!result) {
        log.info("Forbidden request to API", {
          requestPath,
          requestMethod,
          userId: authentication.session.user.id,
          reason: "Insufficient permissions",
        });

        throw new Error("Forbidden");
      }

      return result;
    },
  };
}

export async function requireAuthenticationAction(actionName?: string) {
  const authentication = await authenticate();

  if (!authentication) {
    log.info("Unauthorized request to action", {
      actionName,
      reason: "No session",
    });

    throw new Error("Unauthorized");
  }

  await requireConfirmedEmailForAction(authentication.session);

  if (!(await authentication.authorize("login", "manage")))
    throw new Error("Forbidden");

  return {
    ...authentication,
    authorizeAction: async (
      resource: PermissionSet["resource"],
      operation: PermissionSet["operation"],
      attributes?: PermissionSet["attributes"],
    ) => {
      const result = await authentication.authorize(
        resource,
        operation,
        attributes,
      );

      if (!result) {
        log.info("Unauthorized request to action", {
          actionName,
          userId: authentication.session.user.id,
          reason: "Insufficient permissions",
        });

        throw new Error("Forbidden");
      }

      return result;
    },
  };
}

export const requireAuthentication = cache(async () => {
  const authentication = await authenticate();
  if (!authentication) throw new Error("Unauthorized");
  return authentication;
});

export async function authorize(
  session: Session,
  resource: PermissionSet["resource"],
  operation: PermissionSet["operation"],
  attributes?: PermissionSet["attributes"],
) {
  if (
    session.user.role === "admin" &&
    (await cookies()).get("enable_admin")?.value === "1"
  ) {
    return operation !== "negate";
  }

  const result = comparePermissionSets(
    {
      resource,
      operation,
      attributes,
    },
    session.givenPermissionSets,
  );
  if (!result) return false;

  return true;
}
