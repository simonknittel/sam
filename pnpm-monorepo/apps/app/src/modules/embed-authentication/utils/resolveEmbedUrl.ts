import { env } from "@/env";
import { log } from "@/modules/logging";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import type { Session } from "next-auth";
import "server-only";
import {
  appendEmbedToken,
  collectEmbedPermissionStrings,
  signEmbedToken,
} from "./embedToken";
import { getEmbedSigningKey } from "./getEmbedSigningKey";
import type { EmbedAuthentication } from "./types";

/**
 * Appends the identity token to the iframe URL of an app that opted into
 * authenticated embedding. Apps without an embed configuration, and
 * deployments without a signing key, get their URL back untouched.
 *
 * The admin bypass of `authorize()` is deliberately not reflected: the
 * token only ever carries permission strings the user's roles actually
 * grant, so an admin sees the embed exactly as their roles allow.
 */
export const resolveEmbedUrl = withTrace(
  "resolveEmbedUrl",
  async (
    embedUrl: string,
    session: Session,
    embedAuthentication?: EmbedAuthentication,
  ) => {
    if (!embedAuthentication) return embedUrl;

    const signingKey = await getEmbedSigningKey();
    if (!signingKey) return embedUrl;

    const entity = session.entity;
    if (!entity) {
      /**
       * Reachable for an admin who has no linked entity. There is no
       * meaningful subject for them, so the embed renders unauthenticated
       * and falls back to its anonymous behaviour.
       */
      log.warn("Rendered an authenticated embed without a token", {
        userId: session.user.id,
        audience: embedAuthentication.audience,
        reason: "No entity linked to the user",
      });

      return embedUrl;
    }

    const token = await signEmbedToken({
      signingKey,
      issuer: env.NEXT_PUBLIC_BASE_URL,
      audience: embedAuthentication.audience,
      subject: entity.id,
      handle: entity.handle,
      permissionStrings: collectEmbedPermissionStrings(
        session.givenPermissionSets,
        embedAuthentication.permissionResources,
      ),
    });

    return appendEmbedToken(embedUrl, token);
  },
);
