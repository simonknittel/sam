import { prisma } from "@/db";
import { collectWikiAttachmentUploadIds } from "@sam-monorepo/wiki-editor";

/**
 * Connects the page to every attachment upload referenced in the given
 * content that isn't linked yet — e.g. attachments copy-pasted from another
 * page. Connect-only: stale links (upload no longer in the content) are
 * dropped by the nightly upload cleanup against the persisted content, so
 * an unsaved editing session can't cost an upload its links. The collab
 * server applies the same sync in its persist path.
 */
export const syncWikiPageUploadLinks = async (
  pageId: string,
  content: unknown,
) => {
  const uploadIds = collectWikiAttachmentUploadIds(content);
  if (uploadIds.length === 0) return;

  const page = await prisma.wikiPage.findUnique({
    where: { id: pageId },
    select: { attachments: { select: { id: true } } },
  });
  if (!page) return;

  const linked = new Set(page.attachments.map((upload) => upload.id));
  const missingIds = uploadIds.filter((uploadId) => !linked.has(uploadId));
  if (missingIds.length === 0) return;

  /**
   * Only connect uploads that still exist — content may reference uploads
   * the nightly cleanup already deleted.
   */
  const existing = await prisma.upload.findMany({
    where: { id: { in: missingIds } },
    select: { id: true },
  });
  if (existing.length === 0) return;

  await prisma.wikiPage.update({
    where: { id: pageId },
    data: {
      attachments: { connect: existing.map(({ id }) => ({ id })) },
    },
  });
};
