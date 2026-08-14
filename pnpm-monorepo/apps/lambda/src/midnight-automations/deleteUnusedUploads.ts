import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { prisma } from "@sam-monorepo/database";
import { AuditEventType } from "@sam-monorepo/domain";
import { createAuditEvents } from "../common/audit";
import { log } from "../common/logger";
import { captureAsyncFunc } from "../common/xray";
import { env } from "./setup";

/**
 * Uploads are created in the database before the browser PUTs the file and
 * assigns it to its resource, so recent uploads may not be referenced
 * anywhere yet. Rows and objects younger than this are never touched.
 */
const GRACE_PERIOD_HOURS = 24;

/** DeleteObjects accepts at most 1000 keys per request. */
const DELETE_BATCH_SIZE = 1000;

/**
 * Deletes uploads which are no longer used anywhere, from both the database
 * and the S3 bucket. Replacing an upload (e.g. a role icon) only rewires the
 * foreign key and deleting a resource only nulls it, so the previous upload
 * would otherwise be left behind forever.
 *
 * Wiki page ⇄ upload links (Upload.wikiPages) are reconciled first: content
 * persists only ever add links (see syncWikiPageUploadLinks), so links
 * whose page content no longer references the upload are dropped here.
 *
 * An upload counts as used while it is referenced as a role icon or
 * thumbnail, manufacturer image, wiki page icon or wiki page attachment. As
 * a safety net, uploads whose id still appears in some wiki page content or
 * snapshot (e.g. an image copy-pasted into another page) are kept as well.
 *
 * Afterwards the bucket is swept for objects without an Upload row: deleting
 * a user cascade-deletes their Upload rows without touching S3, so such
 * objects can't be found through the database at all. This also removes the
 * objects of the rows deleted above.
 */
export const deleteUnusedUploads = async () => {
  await captureAsyncFunc("deleteUnusedUploads", async () => {
    const {
      S3_ACCOUNT_ID: accountId,
      S3_ACCESS_KEY_ID: accessKeyId,
      S3_SECRET_ACCESS_KEY: secretAccessKey,
      S3_BUCKET_NAME: bucketName,
    } = env;

    if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
      log.warn(
        "Skipping deleteUnusedUploads since the S3 parameters are not configured",
      );
      return;
    }

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - GRACE_PERIOD_HOURS);

    /**
     * Drop page links whose page content no longer references the upload
     * (destroyed pages already lose their links via the cascading foreign
     * key). The grace period protects fresh uploads whose editing session
     * hasn't persisted the content containing them yet.
     */
    await captureAsyncFunc(
      "reconcile wiki page links",
      () =>
        prisma.$executeRaw`
        DELETE FROM "_attachments" AS "link"
        USING "Upload" AS "upload"
        WHERE "upload"."id" = "link"."A"
          AND "upload"."createdAt" < ${cutoff}
          AND NOT EXISTS (
            SELECT 1 FROM "WikiPage" AS "page"
            WHERE "page"."id" = "link"."B"
              AND "page"."content"::text LIKE '%' || "link"."A" || '%'
          )
      `,
    );

    const unusedUploads = await captureAsyncFunc("find unused uploads", () =>
      prisma.upload.findMany({
        where: {
          createdAt: { lt: cutoff },
          wikiPages: { none: {} },
          roleIcons: { none: {} },
          roleThumbnails: { none: {} },
          manufacturers: { none: {} },
          wikiPageIcons: { none: {} },
        },
        select: { id: true },
      }),
    );

    let deletableIds = unusedUploads.map((upload) => upload.id);

    if (deletableIds.length > 0) {
      const referenced = await captureAsyncFunc(
        "find candidates referenced in wiki content",
        () =>
          prisma.$queryRaw<{ id: string }[]>`
            SELECT "id"
            FROM "Upload"
            WHERE "id" = ANY(${deletableIds})
              AND (
                EXISTS (
                  SELECT 1 FROM "WikiPage"
                  WHERE "content"::text LIKE '%' || "Upload"."id" || '%'
                )
                OR EXISTS (
                  SELECT 1 FROM "WikiPageSnapshot"
                  WHERE "content"::text LIKE '%' || "Upload"."id" || '%'
                )
              )
          `,
      );

      const referencedIds = new Set(referenced.map((row) => row.id));
      deletableIds = deletableIds.filter((id) => !referencedIds.has(id));
    }

    if (deletableIds.length > 0) {
      await captureAsyncFunc("delete unused uploads from the database", () =>
        prisma.upload.deleteMany({
          where: { id: { in: deletableIds } },
        }),
      );
    }

    const s3 = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const objects = await captureAsyncFunc("list bucket objects", async () => {
      const result: { key: string; lastModified?: Date }[] = [];
      let continuationToken: string | undefined;

      do {
        const response = await s3.send(
          new ListObjectsV2Command({
            Bucket: bucketName,
            ContinuationToken: continuationToken,
          }),
        );

        for (const object of response.Contents ?? []) {
          if (!object.Key) continue;
          result.push({ key: object.Key, lastModified: object.LastModified });
        }

        continuationToken = response.NextContinuationToken;
      } while (continuationToken);

      return result;
    });

    const remainingUploads = await captureAsyncFunc(
      "find remaining uploads",
      () => prisma.upload.findMany({ select: { id: true } }),
    );
    const remainingIds = new Set(remainingUploads.map((upload) => upload.id));

    const orphanedKeys = objects
      .filter(
        (object) =>
          !remainingIds.has(object.key) &&
          object.lastModified !== undefined &&
          object.lastModified < cutoff,
      )
      .map((object) => object.key);

    if (orphanedKeys.length > 0) {
      await captureAsyncFunc("delete objects from the bucket", async () => {
        for (
          let offset = 0;
          offset < orphanedKeys.length;
          offset += DELETE_BATCH_SIZE
        ) {
          const response = await s3.send(
            new DeleteObjectsCommand({
              Bucket: bucketName,
              Delete: {
                Objects: orphanedKeys
                  .slice(offset, offset + DELETE_BATCH_SIZE)
                  .map((key) => ({ Key: key })),
                Quiet: true,
              },
            }),
          );

          if (response.Errors && response.Errors.length > 0)
            log.warn("Failed to delete some objects from the bucket", {
              errors: response.Errors,
            });
        }
      });
    }

    if (deletableIds.length > 0 || orphanedKeys.length > 0) {
      log.info("Deleted unused uploads", {
        databaseCount: deletableIds.length,
        bucketCount: orphanedKeys.length,
      });

      await createAuditEvents([
        {
          type: AuditEventType.UNUSED_UPLOADS_DELETED,
          data: {
            databaseCount: deletableIds.length,
            bucketCount: orphanedKeys.length,
          },
        },
      ]);
    }
  });
};
