import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError, NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { UploadErrorMessage } from "../uploads/uploadErrors.js";
import { withSpan } from "../withSpan.js";
import {
  getAccessibleWikiPage,
  WikiPageAccessTier,
} from "./getAccessibleWikiPage.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { loadWikiScopeOfPage } from "./wikiScope.js";

/** The time that the browser has to start the download */
const ATTACHMENT_DOWNLOAD_URL_EXPIRY_SECONDS = 5 * 60;

/**
 * An image is public (nobody can guess its URL), but an attachment is only for
 * an actor who can read a page with the upload.
 *
 * An upload can have links to more than one page (`Upload.wikiPageLinks`, for
 * example after a duplication of a page or a copy between pages). Each linked
 * page that the actor can read gives the download. A link of each kind counts,
 * also the link of an image.
 */
const findDownloadableAttachment = async (
  context: ApplicationContext,
  actor: Actor,
  uploadId: string,
) => {
  const upload = await context.prisma.upload.findUnique({
    where: { id: uploadId },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      wikiPageLinks: { select: { pageId: true }, distinct: ["pageId"] },
    },
  });
  if (!upload) throw new NotFoundError(WikiErrorMessage.AttachmentNotFound);

  /**
   * The linked pages can span scopes (global wiki and event pages), thus each
   * check loads the scope of its page. Uploads rarely link more than one page.
   */
  for (const { pageId } of upload.wikiPageLinks) {
    const scope = await loadWikiScopeOfPage(context, actor, pageId);
    if (
      scope &&
      getAccessibleWikiPage(scope, pageId, WikiPageAccessTier.Read) !== null
    )
      return upload;
  }

  throw new NotFoundError(WikiErrorMessage.AttachmentNotFound);
};

export const createWikiAttachmentDownloadUrlInputSchema = z.object({
  upload_id: idSchema,
});

export type CreateWikiAttachmentDownloadUrlInput = z.infer<
  typeof createWikiAttachmentDownloadUrlInputSchema
>;

export interface CreateWikiAttachmentDownloadUrlOutput {
  readonly url: string;
}

export const createWikiAttachmentDownloadUrl = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateWikiAttachmentDownloadUrlInput,
): Promise<CreateWikiAttachmentDownloadUrlOutput> =>
  withSpan(context, "createWikiAttachmentDownloadUrl", async () => {
    const upload = await findDownloadableAttachment(
      context,
      actor,
      input.upload_id,
    );

    if (!context.storage)
      throw new ConflictError(UploadErrorMessage.StorageNotConfigured);

    /**
     * The stored file name is URI-encoded already (see the upload clients of
     * the app). This agrees with the percent-encoding of `filename*` (RFC
     * 5987), except for the apostrophe: `encodeURIComponent` does not encode
     * it, but RFC 5987 uses it as a delimiter.
     */
    const encodedFileName = upload.fileName.replaceAll("'", "%27");

    const url = await context.storage.createDownloadUrl({
      key: upload.id,
      contentType: upload.mimeType,
      contentDisposition: `attachment; filename*=UTF-8''${encodedFileName}`,
      expiresInSeconds: ATTACHMENT_DOWNLOAD_URL_EXPIRY_SECONDS,
    });

    return { url };
  });
