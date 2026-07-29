import { prisma } from "@/db";
import { WikiPageSnapshotKind } from "@sam-monorepo/database/client";

/**
 * Create an AUTO snapshot when the newest snapshot of the page is older
 * than this and the stored content changed since.
 */
const AUTO_SNAPSHOT_MIN_INTERVAL_MS = 30 * 60 * 1000;
/** AUTO snapshots kept per page (MANUAL safety snapshots are kept forever) */
const AUTO_SNAPSHOT_RETENTION = 50;

/**
 * Preserves the page's stored content as an automatic snapshot before it
 * is overwritten, at most every 30 minutes: any state is snapshotted right
 * before edits replace it, so there is always a restore point at most 30
 * minutes behind — without a manual "save" step. Called from the
 * single-user autosave path; the collab server (apps/collab) runs the same
 * check in its store hook.
 *
 * The common case (a recent snapshot exists) costs one indexed query; the
 * content comparison only runs when the cadence has passed.
 */
export const maybeCreateWikiAutoSnapshot = async (pageId: string) => {
  const newestSnapshot = await prisma.wikiPageSnapshot.findFirst({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });
  if (
    newestSnapshot &&
    Date.now() - newestSnapshot.createdAt.getTime() <
      AUTO_SNAPSHOT_MIN_INTERVAL_MS
  )
    return;

  const page = await prisma.wikiPage.findUnique({
    where: { id: pageId },
    select: { content: true },
  });
  if (!page?.content) return;

  if (newestSnapshot) {
    const newestContent = await prisma.wikiPageSnapshot.findUnique({
      where: { id: newestSnapshot.id },
      select: { content: true },
    });
    if (JSON.stringify(newestContent?.content) === JSON.stringify(page.content))
      return;
  }

  await prisma.wikiPageSnapshot.create({
    data: {
      pageId,
      kind: WikiPageSnapshotKind.AUTO,
      content: page.content,
    },
  });

  const excessSnapshots = await prisma.wikiPageSnapshot.findMany({
    where: { pageId, kind: WikiPageSnapshotKind.AUTO },
    orderBy: { createdAt: "desc" },
    skip: AUTO_SNAPSHOT_RETENTION,
    select: { id: true },
  });
  if (excessSnapshots.length > 0)
    await prisma.wikiPageSnapshot.deleteMany({
      where: { id: { in: excessSnapshots.map((snapshot) => snapshot.id) } },
    });
};
