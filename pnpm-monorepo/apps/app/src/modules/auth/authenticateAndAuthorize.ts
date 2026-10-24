import { authOptions } from "@/modules/auth/server/auth";
import {
  requireConfirmedEmailForApi,
  requireConfirmedEmailForPage,
} from "@/modules/auth/utils/emailConfirmation";
import {
  getLoginPath,
  REQUEST_PATH_HEADER,
  validateRedirectTo,
} from "@/modules/auth/utils/redirectTo";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import {
  comparePermissionSets,
  type PermissionSet,
} from "@sam-monorepo/domain";
import { getServerSession, type Session } from "next-auth";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { isAdminModeActive } from "./utils/isAdminModeActive";

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

/**
 * The gate of each server component of `/app`: a session, a confirmed email
 * and `login;manage`. Call it in each page, layout, slot and
 * `generateMetadata` that loads data, also below a layout that calls it:
 * Next.js renders the segments of a route separately and streams them in one
 * response, thus the redirect of a parent layout does not stop the data of
 * the other segments. The clearance, email confirmation and login pages use
 * `authenticate()` instead, because they serve users without clearance.
 */
export const requireAuthenticationPage = cache(async (requestPath?: string) => {
  const authentication = await authenticate();

  if (!authentication) {
    log.info("Unauthorized request to page", {
      requestPath,
      reason: "No session",
    });

    redirect(
      getLoginPath(
        validateRedirectTo((await headers()).get(REQUEST_PATH_HEADER)),
      ),
    );
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
});

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

export async function authorize(
  session: Session,
  resource: PermissionSet["resource"],
  operation: PermissionSet["operation"],
  attributes?: PermissionSet["attributes"],
) {
  if (await isAdminModeActive(session)) {
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
