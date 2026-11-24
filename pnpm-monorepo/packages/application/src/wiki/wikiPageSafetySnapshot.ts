import { WikiPageSnapshotKind } from "@sam-monorepo/database/client";
import { createWikiPageSnapshotUploadLinks } from "@sam-monorepo/domain";
import { collectWikiUploadReferences } from "@sam-monorepo/wiki-editor";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { WikiErrorMessage } from "./wikiErrors.js";

interface WikiPageSafetySnapshot {
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
const createWikiPageSafetySnapshot = async (
  context: Pick<ApplicationContext, "prisma">,
  { pageId, name, createdById }: WikiPageSafetySnapshot,
) => {
  const page = await context.prisma.wikiPage.findUnique({
    where: { id: pageId },
    select: { content: true },
  });
  const content = page?.content;
  if (!content) return;

  await context.prisma.$transaction(async (transaction) => {
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

/**
 * The content of a page changes only through the collab server, thus the open
 * editors get the new content
 */
export const requireCollab = (
  context: Pick<ApplicationContext, "collab">,
): NonNullable<ApplicationContext["collab"]> => {
  if (!context.collab)
    throw new ConflictError(WikiErrorMessage.CollabNotConfigured);

  return context.collab;
};

interface WikiPageContentReplacementWithSafetySnapshot {
  readonly pageId: string;
  readonly content: object;
  readonly updatedByEntityId: string | null;
  readonly safetySnapshotName: string;
  /** The message of the `ConflictError` when the collab server fails */
  readonly failureMessage: WikiErrorMessage;
}

/** When the collab server fails, the safety snapshot stays */
export const replaceWikiPageContentWithSafetySnapshot = async (
  context: Pick<ApplicationContext, "prisma" | "collab" | "log">,
  {
    pageId,
    content,
    updatedByEntityId,
    safetySnapshotName,
    failureMessage,
  }: WikiPageContentReplacementWithSafetySnapshot,
) => {
  const collab = requireCollab(context);

  await createWikiPageSafetySnapshot(context, {
    pageId,
    name: safetySnapshotName,
    createdById: updatedByEntityId,
  });

  try {
    await collab.replaceContent({ pageId, content, updatedByEntityId });
  } catch (error) {
    context.log.error(failureMessage, { pageId, error });
    throw new ConflictError(failureMessage, { cause: error });
  }
};
