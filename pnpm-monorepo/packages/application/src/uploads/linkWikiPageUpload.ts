import { WikiPageUploadKind } from "@sam-monorepo/database/client";
import {
  isAllowedImageMimeType,
  isAttachmentMimeType,
  UploadCategory,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { loadWikiScopeOfPage } from "../wiki/wikiScope.js";
import { withSpan } from "../withSpan.js";
import { UploadErrorMessage } from "./uploadErrors.js";

export const linkWikiPageUploadInputSchema = z.object({
  page_id: idSchema,
  upload_id: idSchema,
  /**
   * The kind that the editor inserts. The MIME type does not always decide
   * it: an SVG can be an image or an attachment.
   */
  kind: z.enum(UploadCategory),
});

const isMimeTypeOfKind = (kind: UploadCategory, mimeType: string) => {
  switch (kind) {
    case UploadCategory.Image:
      return isAllowedImageMimeType(mimeType);

    case UploadCategory.Attachment:
      return isAttachmentMimeType(mimeType);

    default:
      throw new Error(`Unknown upload category: ${kind satisfies never}`);
  }
};

export type LinkWikiPageUploadInput = z.infer<
  typeof linkWikiPageUploadInputSchema
>;

export interface LinkWikiPageUploadOutput {
  readonly page_id: string;
  /** The probe skips an upload that is not an image */
  readonly probe_upload_id: string;
}

/**
 * Links a new upload (an image or an attachment) to the wiki page that embeds
 * it, thus the download of an attachment can check the visibility of the page
 * before the editor stores the content. After that, the collab server makes
 * the links of each page agree with its stored content (see
 * `replaceWikiPageUploadLinks()`).
 *
 * No audit event: `UPLOAD_CREATED` records the upload and `WIKI_PAGE_UPDATED`
 * records the editing session.
 */
export const linkWikiPageUpload = (
  context: ApplicationContext,
  actor: Actor,
  input: LinkWikiPageUploadInput,
): Promise<LinkWikiPageUploadOutput> =>
  withSpan(context, "linkWikiPageUpload", async () => {
    const citizen = requireCitizen(actor);

    const [scope, upload] = await Promise.all([
      loadWikiScopeOfPage(context, actor, input.page_id),
      context.prisma.upload.findUnique({
        where: { id: input.upload_id },
        select: {
          id: true,
          createdById: true,
          mimeType: true,
          wikiPageLinks: { select: { pageId: true } },
        },
      }),
    ]);
    const page = scope?.pagesById.get(input.page_id);
    if (!scope || !page || page.deletedAt)
      throw new NotFoundError(UploadErrorMessage.TargetNotFound);
    if (!upload) throw new NotFoundError(UploadErrorMessage.UploadNotFound);

    const permissions = scope.permissions.get(page.id);
    const isImage = input.kind === UploadCategory.Image;
    const canUpload = isImage
      ? permissions?.canUploadImages
      : permissions?.canUploadAttachments;
    if (!canUpload)
      throw new ForbiddenError(UploadErrorMessage.TargetNotEditable);
    if (upload.createdById !== citizen.id)
      throw new ForbiddenError(UploadErrorMessage.NotOwnUpload);
    if (upload.wikiPageLinks.some((link) => link.pageId !== page.id))
      throw new ForbiddenError(UploadErrorMessage.LinkedToOtherPage);
    if (!isMimeTypeOfKind(input.kind, upload.mimeType))
      throw new ValidationError(UploadErrorMessage.MimeTypeNotOfKind);

    await context.prisma.wikiPageUpload.createMany({
      data: {
        pageId: page.id,
        uploadId: upload.id,
        kind: isImage
          ? WikiPageUploadKind.IMAGE
          : WikiPageUploadKind.ATTACHMENT,
      },
      skipDuplicates: true,
    });

    return { page_id: page.id, probe_upload_id: upload.id };
  });
