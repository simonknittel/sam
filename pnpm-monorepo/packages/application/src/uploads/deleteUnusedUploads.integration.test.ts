import { prisma } from "@sam-monorepo/database";
import {
  WikiPageSnapshotKind,
  WikiPageUploadKind,
} from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import { beforeEach, expect, test } from "vitest";
import { createTestApplicationContext } from "../../test/applicationContext.js";
import { truncateAllTables } from "../../test/database.js";
import { createTestStorage } from "../../test/storage.js";
import { deleteUnusedUploads } from "./deleteUnusedUploads.js";

const ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 1000;
/** The midnight job runs in the first minutes of a day */
const NOW = new Date("2026-09-28T00:05:00+02:00");
/** Older than the grace period of 24 hours */
const TWO_DAYS_AGO = new Date(NOW.getTime() - 48 * ONE_HOUR_IN_MILLISECONDS);
const ONE_HOUR_AGO = new Date(NOW.getTime() - ONE_HOUR_IN_MILLISECONDS);

const createUpload = (fileName: string, createdAt: Date) =>
  prisma.upload.create({
    data: { fileName, mimeType: "image/png", createdAt },
  });

const createWikiPage = () =>
  prisma.wikiPage.create({
    data: { title: "Seite", slug: "seite" },
    select: { id: true },
  });

const toOldObjects = (keys: readonly string[]) =>
  keys.map((key) => ({ key, lastModified: TWO_DAYS_AGO }));

/** One more than one delete request takes */
const createOrphanedKeys = () =>
  [...new Array(1001).keys()].map((index) => `orphaned-${index}`);

const getRemainingUploadIds = async () =>
  (await prisma.upload.findMany({ select: { id: true } }))
    .map(({ id }) => id)
    .toSorted();

const toSweepAuditEvent = (databaseCount: number, bucketCount: number) => ({
  type: AuditEventType.UNUSED_UPLOADS_DELETED,
  data: { databaseCount, bucketCount },
  createdById: null,
});

beforeEach(async () => {
  await truncateAllTables();
});

test("deletes only the old upload that nothing uses, with its object", async () => {
  const page = await createWikiPage();

  const pageImage = await createUpload("page.png", TWO_DAYS_AGO);
  await prisma.wikiPageUpload.create({
    data: {
      pageId: page.id,
      uploadId: pageImage.id,
      kind: WikiPageUploadKind.IMAGE,
    },
  });

  /** The page does not use it anymore, but a restore point does */
  const snapshotImage = await createUpload("snapshot.png", TWO_DAYS_AGO);
  const snapshot = await prisma.wikiPageSnapshot.create({
    data: {
      pageId: page.id,
      kind: WikiPageSnapshotKind.AUTO,
      content: { type: "doc", content: [] },
    },
    select: { id: true },
  });
  await prisma.wikiPageSnapshotUpload.create({
    data: { snapshotId: snapshot.id, uploadId: snapshotImage.id },
  });

  const roleTagIcon = await createUpload("tag.png", TWO_DAYS_AGO);
  await prisma.roleTag.create({
    data: { name: "Piloten", iconId: roleTagIcon.id },
  });

  /** The editor did not store the content with it yet */
  const freshUpload = await createUpload("fresh.png", ONE_HOUR_AGO);

  const unusedUpload = await createUpload("unused.png", TWO_DAYS_AGO);

  const { storage, deleteRequests } = createTestStorage({
    objects: toOldObjects([
      pageImage.id,
      snapshotImage.id,
      roleTagIcon.id,
      freshUpload.id,
      unusedUpload.id,
    ]),
  });
  const { context, auditEvents } = createTestApplicationContext({
    now: NOW,
    storage,
  });

  expect(await deleteUnusedUploads(context)).toEqual({
    storageConfigured: true,
    databaseCount: 1,
    bucketCount: 1,
  });

  expect(await getRemainingUploadIds()).toEqual(
    [pageImage.id, snapshotImage.id, roleTagIcon.id, freshUpload.id].toSorted(),
  );
  expect(deleteRequests).toEqual([[unusedUpload.id]]);
  expect(auditEvents).toEqual([toSweepAuditEvent(1, 1)]);
});

test("deletes at most 1000 objects per request", async () => {
  /** The row stays, thus its object stays */
  const freshUpload = await createUpload("fresh.png", ONE_HOUR_AGO);
  const orphanedKeys = createOrphanedKeys();

  const { storage, deleteRequests } = createTestStorage({
    objects: [
      ...toOldObjects([...orphanedKeys, freshUpload.id]),
      /** Younger than the grace period, thus it stays without an Upload row */
      { key: "young-object", lastModified: ONE_HOUR_AGO },
    ],
  });
  const { context, auditEvents } = createTestApplicationContext({
    now: NOW,
    storage,
  });

  await deleteUnusedUploads(context);

  expect(deleteRequests.map((keys) => keys.length)).toEqual([1000, 1]);
  expect(deleteRequests.flat()).toEqual(orphanedKeys);
  expect(await getRemainingUploadIds()).toEqual([freshUpload.id]);
  expect(auditEvents).toEqual([toSweepAuditEvent(0, 1001)]);
});

test("counts only the objects that the bucket deleted", async () => {
  const orphanedKeys = ["orphaned-0", "orphaned-1", "orphaned-2"];
  const { storage, deleteRequests } = createTestStorage({
    objects: toOldObjects(orphanedKeys),
    failingDeleteKeys: ["orphaned-1"],
  });
  const { context, auditEvents } = createTestApplicationContext({
    now: NOW,
    storage,
  });

  await deleteUnusedUploads(context);

  expect(deleteRequests.flat()).toEqual(orphanedKeys);
  expect(auditEvents).toEqual([toSweepAuditEvent(0, 2)]);
});

test("records the deleted rows and objects also when the bucket fails", async () => {
  const unusedUpload = await createUpload("unused.png", TWO_DAYS_AGO);

  const { storage, deleteRequests } = createTestStorage({
    objects: toOldObjects([unusedUpload.id, ...createOrphanedKeys()]),
    rejectsDeleteFromRequest: 1,
  });
  const { context, auditEvents } = createTestApplicationContext({
    now: NOW,
    storage,
  });

  await expect(deleteUnusedUploads(context)).rejects.toThrow(
    "The bucket is not available",
  );

  expect(await getRemainingUploadIds()).toEqual([]);
  expect(deleteRequests.map((keys) => keys.length)).toEqual([1000, 2]);
  expect(auditEvents).toEqual([toSweepAuditEvent(1, 1000)]);
});

test("deletes nothing without a bucket", async () => {
  const unusedUpload = await createUpload("unused.png", TWO_DAYS_AGO);
  const { context, auditEvents } = createTestApplicationContext({
    now: NOW,
    storage: null,
  });

  expect(await deleteUnusedUploads(context)).toEqual({
    storageConfigured: false,
    databaseCount: 0,
    bucketCount: 0,
  });

  expect(await getRemainingUploadIds()).toEqual([unusedUpload.id]);
  expect(auditEvents).toEqual([]);
});
