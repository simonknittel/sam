import {
  AuditEventType,
  USER_AGENT_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { requireMcpAccess } from "../mcpAccess.js";
import { withSpan } from "../withSpan.js";
import { AUTHORIZATION_CODE_LIFETIME_IN_MILLISECONDS } from "./constants.js";
import type { ClientMetadata } from "./resolveClientMetadata.js";
import { createOpaqueToken, hashOpaqueToken } from "./secrets.js";

/**
 * The fields of a valid authorization request and the settings of the
 * consent. Give only the result of `validateAuthorizationRequest()` for the
 * fields of the request.
 */
export interface CreateGrantWithAuthorizationCodeInput {
  readonly client: Pick<ClientMetadata, "clientId" | "clientName">;
  readonly redirectUri: string;
  readonly codeChallenge: string;
  readonly scope: string;
  readonly resource: string;
  /** The name that the user gave the client, see `grantCustomNameSchema` */
  readonly customName: string | null;
  /**
   * The tools that the user disabled for the client. The catalog of the
   * tools is in the MCP package, thus the caller makes sure that the tools
   * exist.
   */
  readonly disabledToolNames: readonly string[];
  /** The user agent of the browser that gives the consent */
  readonly userAgent: string | null;
}

export interface CreateGrantWithAuthorizationCodeOutput {
  readonly grantId: string;
  /** Give it only to the redirect URI. Never log it. */
  readonly code: string;
}

/**
 * The host of the redirect URI for the list of the connected clients. A
 * private-use scheme of a native app has no host, thus the list shows the
 * scheme.
 */
const getRedirectHost = (redirectUri: string) => {
  const url = new URL(redirectUri);

  return url.hostname || url.protocol.replace(/:$/, "");
};

/**
 * Records the consent of the user: a new grant (the connected client) and
 * its authorization code. Each consent gives a new grant, also for a client
 * that the user connected before.
 */
export const createGrantWithAuthorizationCode = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateGrantWithAuthorizationCodeInput,
): Promise<CreateGrantWithAuthorizationCodeOutput> =>
  withSpan(context, "createGrantWithAuthorizationCode", async () => {
    actor.requireClearance();
    requireMcpAccess(actor);

    const code = createOpaqueToken();
    const now = context.now();
    const disabledToolNames = [...new Set(input.disabledToolNames)].sort();

    const grant = await context.prisma.$transaction(async (transaction) => {
      const grant = await transaction.oAuthGrant.create({
        data: {
          userId: actor.userId,
          clientId: input.client.clientId,
          clientName: input.client.clientName,
          customName: input.customName,
          redirectHost: getRedirectHost(input.redirectUri),
          userAgent:
            input.userAgent?.slice(0, USER_AGENT_MAXIMUM_LENGTH) ?? null,
          scope: input.scope,
          resource: input.resource,
          toolSettings: {
            createMany: {
              data: disabledToolNames.map((toolName) => ({
                toolName,
                disabledAt: now,
              })),
            },
          },
        },
        select: { id: true },
      });

      await transaction.oAuthAuthorizationCode.create({
        data: {
          codeHash: hashOpaqueToken(code),
          clientId: input.client.clientId,
          redirectUri: input.redirectUri,
          codeChallenge: input.codeChallenge,
          scope: input.scope,
          resource: input.resource,
          userId: actor.userId,
          grantId: grant.id,
          expiresAt: new Date(
            now.getTime() + AUTHORIZATION_CODE_LIFETIME_IN_MILLISECONDS,
          ),
        },
        select: { id: true },
      });

      return grant;
    });

    await context.audit.create([
      {
        type: AuditEventType.OAUTH_GRANT_CREATED_V2,
        data: {
          grantId: grant.id,
          clientId: input.client.clientId,
          clientName: input.client.clientName,
          customName: input.customName,
          disabledToolNames,
        },
        createdById: actor.userId,
      },
    ]);

    return { grantId: grant.id, code };
  });
