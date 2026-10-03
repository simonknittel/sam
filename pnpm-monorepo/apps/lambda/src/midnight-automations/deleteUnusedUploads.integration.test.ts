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

vi.mock("@aws-sdk/client-s3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@aws-sdk/client-s3")>()),
  S3Client: class {
    send = sendMock;
  },
}));

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

/** Each upload has an old object in the bucket */
const mockBucket = (uploadIds: readonly string[]) => {
  sendMock.mockImplementation((command: unknown) => {
    if (command instanceof ListObjectsV2Command)
      return Promise.resolve({
        Contents: uploadIds.map((uploadId) => ({
          Key: uploadId,
          LastModified: TWO_DAYS_AGO,
        })),
      });

    return Promise.resolve({});
  });
};

const getDeletedObjectKeys = () =>
  sendMock.mock.calls
    .map(([command]: unknown[]) => command)
    .filter((command) => command instanceof DeleteObjectsCommand)
    .flatMap((command) =>
      (command.input.Delete?.Objects ?? []).map((object) => object.Key),
    );

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

  mockBucket([pageImage.id, snapshotImage.id, freshUpload.id, unusedUpload.id]);

  await deleteUnusedUploads();

  expect(await getRemainingUploadIds()).toEqual(
    [pageImage.id, snapshotImage.id, freshUpload.id].toSorted(),
  );
  expect(getDeletedObjectKeys()).toEqual([unusedUpload.id]);

  const auditEvents = await prisma.auditEvent.findMany({
    where: { type: AuditEventType.UNUSED_UPLOADS_DELETED },
  });
  /** The Lambdas write the payload as a JSON string, like the app */
  expect(auditEvents.map(({ data }) => JSON.parse(String(data)))).toEqual([
    { databaseCount: 1, bucketCount: 1 },
  ]);
});
