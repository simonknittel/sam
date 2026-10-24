import { authenticate, requireAuthenticationPage } from "@/modules/auth/server";
import { cache } from "react";
import { toActor } from "./toActor";

/**
 * The actor of the current request, one time for each render. It runs the
 * gate of the pages (see `requireAuthenticationPage()`), thus a layout, a
 * slot or `generateMetadata` that reads through it is gated too. A server
 * action builds the actor with `toActor()` from the session that
 * `createAuthenticatedAction` gives it.
 */
export const getRequestActor = cache(async () =>
  toActor((await requireAuthenticationPage()).session),
);

/**
 * The actor of the current request, or null without a session or without
 * clearance. For the reads of the shell (the layout of `/app` and the login
 * page): they give an empty answer instead of a redirect, also when the
 * session expired.
 */
export const getOptionalRequestActor = cache(async () => {
  const authentication = await authenticate();
  if (!authentication) return null;

  const actor = await toActor(authentication.session);
  return actor.hasClearance() ? actor : null;
});
