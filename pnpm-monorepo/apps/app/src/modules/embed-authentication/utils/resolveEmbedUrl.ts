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

export enum AuthenticatedEmbedUrlStatus {
  Signed = "signed",
  NoSigningKey = "noSigningKey",
  /** An admin can have no linked entity */
  NoEntity = "noEntity",
}

export type AuthenticatedEmbedUrl =
  | {
      readonly status: AuthenticatedEmbedUrlStatus.Signed;
      readonly url: string;
      readonly expiresAt: Date;
    }
  | {
      readonly status:
        | AuthenticatedEmbedUrlStatus.NoSigningKey
        | AuthenticatedEmbedUrlStatus.NoEntity;
    };

/**
 * A page that cannot show its embed without a token (the statistics page) uses
 * this function and shows a note instead.
 *
 * The token does not show the admin bypass of `authorize()` (see
 * docs/embedded-app-authentication.md).
 */
export const authenticateEmbedUrl = withTrace(
  "authenticateEmbedUrl",
  async (
    embedUrl: string,
    session: Session,
    embedAuthentication: EmbedAuthentication,
  ): Promise<AuthenticatedEmbedUrl> => {
    const signingKey = await getEmbedSigningKey();
    if (!signingKey)
      return { status: AuthenticatedEmbedUrlStatus.NoSigningKey };

    const entity = session.entity;
    if (!entity) return { status: AuthenticatedEmbedUrlStatus.NoEntity };

    const { token, expiresAt } = await signEmbedToken({
      signingKey,
      issuer: env.NEXT_PUBLIC_BASE_URL,
      audience: embedAuthentication.audience,
      subject: entity.id,
      handle: entity.handle,
      permissionStrings: collectEmbedPermissionStrings(
        session.givenPermissionSets,
        embedAuthentication.permissionResources,
      ),
      lifetimeInSeconds: embedAuthentication.lifetimeInSeconds,
    });

    return {
      status: AuthenticatedEmbedUrlStatus.Signed,
      url: appendEmbedToken(
        embedUrl,
        token,
        embedAuthentication.queryParameter,
      ),
      expiresAt,
    };
  },
);

export const resolveEmbedUrl = withTrace(
  "resolveEmbedUrl",
  async (
    embedUrl: string,
    session: Session,
    embedAuthentication?: EmbedAuthentication,
  ) => {
    if (!embedAuthentication) return embedUrl;

    const authenticatedEmbedUrl = await authenticateEmbedUrl(
      embedUrl,
      session,
      embedAuthentication,
    );

    switch (authenticatedEmbedUrl.status) {
      case AuthenticatedEmbedUrlStatus.Signed:
        return authenticatedEmbedUrl.url;

      case AuthenticatedEmbedUrlStatus.NoSigningKey:
        return embedUrl;

      case AuthenticatedEmbedUrlStatus.NoEntity:
        // The embed renders unauthenticated and falls back to its anonymous
        // behaviour
        log.warn("Rendered an authenticated embed without a token", {
          userId: session.user.id,
          audience: embedAuthentication.audience,
          reason: "No entity linked to the user",
        });

        return embedUrl;

      default:
        throw new Error(
          `Unknown status: ${authenticatedEmbedUrl satisfies never}`,
        );
    }
  },
);
