import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { withSpan } from "../withSpan.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { loadWikiScopeOfPage } from "./wikiScope.js";

export const createWikiCollabTokenInputSchema = z.object({
  page_id: idSchema,
});

export type CreateWikiCollabTokenInput = z.output<
  typeof createWikiCollabTokenInputSchema
>;

export interface CreateWikiCollabTokenOutput {
  readonly token: string;
  /**
   * Whether the token allows edits. The editor reloads the page when the
   * value differs from the permission that the page has.
   */
  readonly canEdit: boolean;
}

/**
 * The editor asks for a new token on each connection and on an interval during
 * the connection. The briefing of an event that is over gives no edit
 * permission, thus its token is read-only.
 */
export const createWikiCollabToken = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateWikiCollabTokenInput,
): Promise<CreateWikiCollabTokenOutput> =>
  withSpan(context, "createWikiCollabToken", async () => {
    const { collab } = context;
    if (!collab) throw new ConflictError(WikiErrorMessage.CollabNotConfigured);

    const scope = await loadWikiScopeOfPage(context, actor, input.page_id);
    const page = scope?.pagesById.get(input.page_id);
    if (!scope || !page || page.deletedAt)
      throw new NotFoundError(WikiErrorMessage.PageNotFound);

    const permissions = scope.permissions.get(page.id);
    if (!permissions?.canRead) throw new ForbiddenError();

    const token = await collab.createSessionToken({
      userId: actor.userId,
      pageId: page.id,
      entityId: actor.citizen?.id ?? null,
      canEdit: permissions.canEdit,
    });

    return { token, canEdit: permissions.canEdit };
  });
