import {
  AuditEventType,
  USER_AGENT_MAXIMUM_LENGTH,
} from "@sam-monorepo/domain";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { AUTHORIZATION_CODE_LIFETIME_IN_MILLISECONDS } from "./constants.js";
import type { ClientMetadata } from "./resolveClientMetadata.js";
import {
  getOAuthResourceOfClient,
  getOAuthResourceScope,
  getOAuthResourceUrl,
  OAuthResource,
  requireOAuthResourceUse,
  toOAuthResourceActor,
} from "./resources.js";
import { createOpaqueToken, hashOpaqueToken } from "./secrets.js";

/**
 * Give only the result of `validateAuthorizationRequest()` for the fields of
 * the request
 */
export interface CreateGrantWithAuthorizationCodeInput {
  /** Selects the resource and the scope of the grant */
  readonly client: Pick<ClientMetadata, "clientId" | "clientName">;
  readonly redirectUri: string;
  readonly codeChallenge: string;
  /** See `grantCustomNameSchema` */
  readonly customName: string | null;
  /**
   * The caller makes sure that the tools exist (see `mcpToolNameSchema`).
   * Only a grant of the MCP server has tools.
   */
  readonly disabledToolNames: readonly string[];
  readonly userAgent: string | null;
}

export interface CreateGrantWithAuthorizationCodeOutput {
  readonly grantId: string;
  /** Give it only to the redirect URI. Never log it. */
  readonly code: string;
}

/**
 * A private-use scheme of a native app has no host, thus the list of the
 * connected clients shows the scheme
 */
const getRedirectHost = (redirectUri: string) => {
  const url = new URL(redirectUri);

  return url.hostname || url.protocol.replace(/:$/, "");
};

/**
 * Each consent gives a new grant, also for a client that the user connected
 * before
 *
 * @throws ForbiddenError without the clearance or the permission of the
 * resource (see `requireOAuthResourceUse()`)
 * @throws ValidationError for disabled tools of a grant of the desktop
 * companion
 */
export const createGrantWithAuthorizationCode = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateGrantWithAuthorizationCodeInput,
): Promise<CreateGrantWithAuthorizationCodeOutput> =>
  withSpan(context, "createGrantWithAuthorizationCode", async () => {
    const oauthResource = getOAuthResourceOfClient(
      context,
      input.client.clientId,
    );
    const resourceActor = toOAuthResourceActor(actor, oauthResource);
    resourceActor.requireClearance();
    requireOAuthResourceUse(resourceActor, oauthResource);

    if (
      oauthResource !== OAuthResource.Mcp &&
      input.disabledToolNames.length > 0
    )
      throw new ValidationError("Only a grant of the MCP server has tools");

    const scope = getOAuthResourceScope(oauthResource);
    const resource = getOAuthResourceUrl(context, oauthResource).href;
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
          scope,
          resource,
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
          scope,
          resource,
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
