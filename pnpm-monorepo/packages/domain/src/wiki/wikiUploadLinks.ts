import type { Prisma, WikiPageUploadKind } from "@sam-monorepo/database/client";

/**
 * An upload that the content of a wiki page or snapshot possibly uses. The
 * editor package collects these from the content
 * (`collectWikiUploadReferences`); only the database knows which of them
 * exist.
 */
export interface WikiUploadLinkCandidate {
  readonly uploadId: string;
  readonly kind: WikiPageUploadKind;
}

const findExistingUploadIds = async (
  client: Prisma.TransactionClient,
  candidates: readonly Pick<WikiUploadLinkCandidate, "uploadId">[],
) => {
  if (candidates.length === 0) return new Set<string>();

  const uploads = await client.upload.findMany({
    where: {
      id: { in: [...new Set(candidates.map(({ uploadId }) => uploadId))] },
    },
    select: { id: true },
  });

  return new Set(uploads.map(({ id }) => id));
};

const getLinkKey = ({ uploadId, kind }: WikiUploadLinkCandidate) =>
  `${kind}:${uploadId}`;

/**
 * Makes the upload links of a wiki page agree with its content: it adds the
 * missing links and deletes the links that the content does not use
 * anymore. Candidates without an upload get no link. Unchanged links stay,
 * thus a store without a change in the uploads writes nothing.
 *
 * Call it with the transaction that writes the content, so that the links
 * always agree with the stored content. It takes the client from the
 * caller, thus this package still creates no database client itself.
 */
export const replaceWikiPageUploadLinks = async (
  transaction: Prisma.TransactionClient,
  pageId: string,
  candidates: readonly WikiUploadLinkCandidate[],
) => {
  const existingUploadIds = await findExistingUploadIds(
    transaction,
    candidates,
  );
  const wantedLinks = new Map(
    candidates
      .filter(({ uploadId }) => existingUploadIds.has(uploadId))
      .map((candidate) => [getLinkKey(candidate), candidate]),
  );

  const currentLinks = await transaction.wikiPageUpload.findMany({
    where: { pageId },
    select: { id: true, uploadId: true, kind: true },
  });
  const currentLinkKeys = new Set(currentLinks.map(getLinkKey));

  const staleLinkIds = currentLinks
    .filter((link) => !wantedLinks.has(getLinkKey(link)))
    .map(({ id }) => id);
  const newLinks = [...wantedLinks.values()].filter(
    (link) => !currentLinkKeys.has(getLinkKey(link)),
  );

  if (staleLinkIds.length > 0)
    await transaction.wikiPageUpload.deleteMany({
      where: { id: { in: staleLinkIds } },
    });

  if (newLinks.length > 0)
    await transaction.wikiPageUpload.createMany({
      data: newLinks.map(({ uploadId, kind }) => ({ pageId, uploadId, kind })),
      skipDuplicates: true,
    });
};

/**
 * Links a new snapshot to the uploads that its content uses, so that the
 * nightly upload cleanup keeps the uploads of each restore point.
 * Candidates without an upload get no link.
 *
 * Call it with the transaction that creates the snapshot. It takes the
 * client from the caller, thus this package still creates no database
 * client itself.
 */
export const createWikiPageSnapshotUploadLinks = async (
  transaction: Prisma.TransactionClient,
  snapshotId: string,
  candidates: readonly Pick<WikiUploadLinkCandidate, "uploadId">[],
) => {
  const existingUploadIds = await findExistingUploadIds(
    transaction,
    candidates,
  );
  if (existingUploadIds.size === 0) return;

  await transaction.wikiPageSnapshotUpload.createMany({
    data: [...existingUploadIds].map((uploadId) => ({ snapshotId, uploadId })),
    skipDuplicates: true,
  });
};
