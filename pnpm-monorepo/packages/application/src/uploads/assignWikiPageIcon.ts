import { AuditEventType } from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  ForbiddenError,
  NotFoundError,
  rethrowRecordNotFound,
} from "../errors.js";
import { idSchema } from "../pagination.js";
import { isWikiScopeFrozen, loadWikiScopeOfPage } from "../wiki/wikiScope.js";
import { withSpan } from "../withSpan.js";
import {
  findAssignableUpload,
  requireOwnImageUpload,
} from "./assignableUpload.js";
import { UploadErrorMessage } from "./uploadErrors.js";

export const assignWikiPageIconInputSchema = z.object({
  page_id: idSchema,
  /** Null removes the icon */
  upload_id: idSchema.nullable(),
});

export type AssignWikiPageIconInput = z.infer<
  typeof assignWikiPageIconInputSchema
>;

export interface AssignWikiPageIconOutput {
  readonly page_id: string;
  readonly probe_upload_id: string | null;
}

/**
 * A change of the icon needs the admin tier of the page, as a change of the
 * title, and does not depend on the upload settings of the page
 */
export const assignWikiPageIcon = (
  context: ApplicationContext,
  actor: Actor,
  input: AssignWikiPageIconInput,
): Promise<AssignWikiPageIconOutput> =>
  withSpan(context, "assignWikiPageIcon", async () => {
    const citizen = requireCitizen(actor);

    const [scope, upload] = await Promise.all([
      loadWikiScopeOfPage(context, actor, input.page_id),
      findAssignableUpload(context, input.upload_id),
    ]);
    const page = scope?.pagesById.get(input.page_id);
    if (!scope || !page || page.deletedAt)
      throw new NotFoundError(UploadErrorMessage.TargetNotFound);
    if (input.upload_id !== null && !upload)
      throw new NotFoundError(UploadErrorMessage.UploadNotFound);

    if (!scope.permissions.get(page.id)?.canAdmin || isWikiScopeFrozen(scope))
      throw new ForbiddenError(UploadErrorMessage.TargetNotEditable);
    if (upload) requireOwnImageUpload(upload, citizen);

    await rethrowRecordNotFound(
      () =>
        context.prisma.wikiPage.update({
          where: { id: page.id },
          data: { iconId: input.upload_id, updatedById: citizen.id },
          select: { id: true },
        }),
      UploadErrorMessage.TargetNotFound,
    );

    await context.audit.create([
      {
        type: AuditEventType.WIKI_PAGE_ICON_UPDATED,
        data: {
          pageId: page.id,
          eventId: page.eventId ?? undefined,
          iconId: input.upload_id,
        },
        createdById: actor.userId,
      },
    ]);

    return { page_id: page.id, probe_upload_id: input.upload_id };
  });
