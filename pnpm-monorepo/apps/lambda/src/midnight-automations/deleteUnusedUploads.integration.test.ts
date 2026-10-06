import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { prisma } from "@sam-monorepo/database";
import {
  WikiPageSnapshotKind,
  WikiPageUploadKind,
} from "@sam-monorepo/database/client";
import { AuditEventType } from "@sam-monorepo/domain";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { truncateAllTables } from "../../test/database";
import { deleteUnusedUploads } from "./deleteUnusedUploads";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));

vi.mock("./setup", () => ({
  env: {
    S3_ACCOUNT_ID: "account",
    S3_ACCESS_KEY_ID: "access-key",
    S3_SECRET_ACCESS_KEY: "secret-key",
    S3_BUCKET_NAME: "uploads",
  },
}));

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const original = await importOriginal<typeof import("@aws-sdk/client-s3")>();

  /** The paginator accepts only an instance of the original client. */
  class S3Client extends original.S3Client {
    override send(...parameters: unknown[]) {
      return sendMock(...parameters);
    }
  }

  return { ...original, S3Client };
});

const ONE_HOUR_MS = 60 * 60 * 1000;
/** The midnight job runs in the first minutes of a day */
const NOW = new Date("2026-09-28T00:05:00+02:00");
/** Older than the grace period of 24 hours */
const TWO_DAYS_AGO = new Date(NOW.getTime() - 48 * ONE_HOUR_MS);

const createUpload = (fileName: string, createdAt: Date) =>
  prisma.upload.create({
    data: { fileName, mimeType: "image/png", createdAt },
  });

const createWikiPage = () =>
  prisma.wikiPage.create({
    data: { title: "Seite", slug: "seite" },
    select: { id: true },
  });

interface BucketObject {
  readonly key: string;
  readonly lastModified: Date;
}

const toOldObjects = (keys: readonly string[]): BucketObject[] =>
  keys.map((key) => ({ key, lastModified: TWO_DAYS_AGO }));

/**
 * The bucket lists the pages one after the other. The continuation token is
 * the index of the next page.
 *
 * @returns the continuation token of each list request. The paginator changes
 * the input of its commands, thus the mock records the token at the request.
 */
const mockBucket = (pages: readonly (readonly BucketObject[])[]) => {
  const requestedContinuationTokens: (string | undefined)[] = [];

  sendMock.mockImplementation((command: unknown) => {
    if (command instanceof ListObjectsV2Command) {
      const continuationToken = command.input.ContinuationToken;
      requestedContinuationTokens.push(continuationToken);

      const pageIndex = Number(continuationToken ?? 0);
      const page = pages[pageIndex];
      if (!page) throw new Error(`Unknown page: ${continuationToken}`);

      return Promise.resolve({
        Contents: page.map((object) => ({
          Key: object.key,
          LastModified: object.lastModified,
        })),
        NextContinuationToken:
          pageIndex + 1 < pages.length ? String(pageIndex + 1) : undefined,
      });
    }

    return Promise.resolve({});
  });

  return requestedContinuationTokens;
};

const getDeleteRequests = () =>
  sendMock.mock.calls
    .map(([command]: unknown[]) => command)
    .filter((command) => command instanceof DeleteObjectsCommand)
    .map((command) =>
      (command.input.Delete?.Objects ?? []).map((object) => object.Key),
    );

const getDeletedObjectKeys = () => getDeleteRequests().flat();

const getRemainingUploadIds = async () =>
  (await prisma.upload.findMany({ select: { id: true } }))
    .map(({ id }) => id)
    .toSorted();

beforeEach(async () => {
  await truncateAllTables();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
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

  /** The editor did not store the content with it yet */
  const freshUpload = await createUpload(
    "fresh.png",
    new Date(NOW.getTime() - ONE_HOUR_MS),
  );

  const unusedUpload = await createUpload("unused.png", TWO_DAYS_AGO);

  mockBucket([
    toOldObjects([
      pageImage.id,
      snapshotImage.id,
      freshUpload.id,
      unusedUpload.id,
    ]),
  ]);

  await deleteUnusedUploads();

  expect(await getRemainingUploadIds()).toEqual(
    [pageImage.id, snapshotImage.id, freshUpload.id].toSorted(),
  );
  expect(getDeletedObjectKeys()).toEqual([unusedUpload.id]);

  const auditEvents = await prisma.auditEvent.findMany({
    where: { type: AuditEventType.UNUSED_UPLOADS_DELETED },
  });
  expect(auditEvents.map(({ data }) => data)).toEqual([
    { databaseCount: 1, bucketCount: 1 },
  ]);
});

test("sweeps all pages of the bucket and deletes at most 1000 objects per request", async () => {
  /** The row stays, thus its object stays */
  const freshUpload = await createUpload(
    "fresh.png",
    new Date(NOW.getTime() - ONE_HOUR_MS),
  );

  /** One more than DeleteObjects accepts in one request */
  const orphanedKeys = [...new Array(1001).keys()].map(
    (index) => `orphaned-${index}`,
  );

  const requestedContinuationTokens = mockBucket([
    toOldObjects(orphanedKeys.slice(0, 1000)),
    [
      ...toOldObjects([...orphanedKeys.slice(1000), freshUpload.id]),
      /** Younger than the grace period, thus it stays without an Upload row */
      {
        key: "young-object",
        lastModified: new Date(NOW.getTime() - ONE_HOUR_MS),
      },
    ],
  ]);

  await deleteUnusedUploads();

  expect(requestedContinuationTokens).toEqual([undefined, "1"]);
  expect(getDeleteRequests().map((keys) => keys.length)).toEqual([1000, 1]);
  expect(getDeletedObjectKeys()).toEqual(orphanedKeys);
  expect(await getRemainingUploadIds()).toEqual([freshUpload.id]);

  const auditEvents = await prisma.auditEvent.findMany({
    where: { type: AuditEventType.UNUSED_UPLOADS_DELETED },
  });
  expect(auditEvents.map(({ data }) => data)).toEqual([
    { databaseCount: 0, bucketCount: 1001 },
  ]);
});
