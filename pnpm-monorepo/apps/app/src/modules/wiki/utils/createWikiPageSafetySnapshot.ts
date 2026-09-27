import { prisma } from "@/db";
import { WikiPageSnapshotKind } from "@sam-monorepo/database/client";
import { createWikiPageSnapshotUploadLinks } from "@sam-monorepo/domain";
import { collectWikiUploadReferences } from "@sam-monorepo/wiki-editor";

interface Options {
  readonly pageId: string;
  /** Tells in the snapshot list which write replaced the content */
  readonly name: string;
  readonly createdById: string | null;
}

/**
 * Keeps the stored content of a page as a MANUAL snapshot before an internal
 * write replaces it (import, snapshot restore, paste that replaces a page):
 * the undo path of that write. The snapshot links its uploads in the same
 * transaction, so that the nightly upload cleanup keeps them. A page without
 * stored content gets no snapshot.
 */
export const createWikiPageSafetySnapshot = async ({
  pageId,
  name,
  createdById,
}: Options) => {
  const page = await prisma.wikiPage.findUnique({
    where: { id: pageId },
    select: { content: true },
  });
  const content = page?.content;
  if (!content) return;

  await prisma.$transaction(async (transaction) => {
    const snapshot = await transaction.wikiPageSnapshot.create({
      data: {
        pageId,
        kind: WikiPageSnapshotKind.MANUAL,
        name,
        content,
        createdById,
      },
      select: { id: true },
    });
    await createWikiPageSnapshotUploadLinks(
      transaction,
      snapshot.id,
      collectWikiUploadReferences(content),
    );
  });
};
