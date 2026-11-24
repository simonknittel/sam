import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type GetObjectCommandOutput,
  type S3Client,
} from "@aws-sdk/client-s3";
import {
  MAXIMUM_STORAGE_DELETE_KEYS,
  type FileStorage,
  type StoredObject,
} from "@sam-monorepo/application";
import * as z from "zod";

/**
 * The default of a read. Shorter than the copy: a read sits inside an
 * interactive save that also waits on a different service afterwards, for
 * example on Discord.
 */
const READ_TIMEOUT_MILLISECONDS = 10_000;

/** See `copyUploadInTransaction()` of the application package */
const COPY_TIMEOUT_MILLISECONDS = 30_000;

const HEAD_TIMEOUT_MILLISECONDS = 10_000;

const LIST_PAGE_TIMEOUT_MILLISECONDS = 10_000;

/**
 * 10 000 pages of at most 1 000 keys are 10 million objects, much more than
 * the bucket of the uploads holds. A storage that gives pages without an end
 * stops the list at this limit.
 */
const MAXIMUM_STORAGE_LIST_PAGES = 10_000;

/** A request with 1 000 keys takes longer than a usual request */
const DELETE_TIMEOUT_MILLISECONDS = 30_000;

/** For example "bytes 0-65535/1234567", or "bytes 0-65535/*" */
const CONTENT_RANGE_PATTERN = /^bytes \d+-\d+\/(?:\d+|\*)$/;

/**
 * Undefined when the storage does not know the size of the whole object ("*")
 */
const contentRangeSchema = z
  .string()
  .regex(CONTENT_RANGE_PATTERN)
  .transform((contentRange) => {
    const wholeSize = contentRange.slice(contentRange.lastIndexOf("/") + 1);
    return wholeSize === "*" ? undefined : Number(wholeSize);
  })
  .optional();

const objectSizeSchema = z.int().nonnegative().optional();

const storedObjectSchema = z.object({
  Key: z.string().min(1),
  LastModified: z.date(),
});

const deleteErrorsSchema = z
  .array(z.object({ Key: z.string(), Code: z.string().optional() }))
  .max(MAXIMUM_STORAGE_DELETE_KEYS);

/**
 * For a range request, `ContentLength` is the length of the range, and
 * `ContentRange` gives the size of the whole object. A storage that ignores
 * the range sends the whole object without `ContentRange`.
 */
const getWholeObjectSize = ({
  ContentLength,
  ContentRange,
}: GetObjectCommandOutput) =>
  contentRangeSchema.parse(ContentRange) ?? ContentLength;

/**
 * Loaded on demand: the Lambda bundles keep `@aws-sdk` external, and no
 * Lambda function makes a presigned URL. Thus a function does not need the
 * module at its start, also when the runtime of AWS Lambda does not have it.
 */
const loadGetSignedUrl = async () =>
  (await import("@aws-sdk/s3-request-presigner")).getSignedUrl;

export interface S3StorageOptions {
  /** The presigned URLs need the configured client, not only its `send()` */
  readonly client: S3Client;
  readonly bucketName: string;
}

/**
 * The key of an object is the ID of its upload. Every method throws on a
 * storage error.
 */
export const createS3Storage = ({
  client,
  bucketName,
}: S3StorageOptions): FileStorage => ({
  readObject: async (
    key,
    {
      maximumBytes,
      byteRange,
      timeoutMilliseconds = READ_TIMEOUT_MILLISECONDS,
    },
  ) => {
    const object = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        ...(byteRange && {
          Range: `bytes=${byteRange.first}-${byteRange.last}`,
        }),
      }),
      { abortSignal: AbortSignal.timeout(timeoutMilliseconds) },
    );
    if (!object.Body) return null;

    const objectSize = byteRange
      ? getWholeObjectSize(object)
      : object.ContentLength;
    if (objectSize !== undefined && objectSize > maximumBytes) return null;

    const bytes = await object.Body.transformToByteArray();
    // The declared length is only a header: an absent or incorrect one must
    // not let an object of unbounded size through
    if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) return null;

    return bytes;
  },

  copyObject: async ({ sourceKey, targetKey, contentType }) => {
    await client.send(
      new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${encodeURIComponent(sourceKey)}`,
        Key: targetKey,
        ContentType: contentType,
        // Without it, S3 keeps the metadata of the source and ignores the new
        // content type
        MetadataDirective: "REPLACE",
      }),
      { abortSignal: AbortSignal.timeout(COPY_TIMEOUT_MILLISECONDS) },
    );
  },

  getObjectSize: async (key) => {
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucketName, Key: key }),
      { abortSignal: AbortSignal.timeout(HEAD_TIMEOUT_MILLISECONDS) },
    );

    return objectSizeSchema.parse(head.ContentLength) ?? null;
  },

  // A loop, not the paginator of the SDK: each page needs its own timeout
  listObjects: async () => {
    const objects: StoredObject[] = [];
    const seenContinuationTokens = new Set<string>();
    let continuationToken: string | undefined;
    let pageCount = 0;

    do {
      pageCount += 1;
      if (pageCount > MAXIMUM_STORAGE_LIST_PAGES)
        throw new Error(
          `The list of the storage has more than ${MAXIMUM_STORAGE_LIST_PAGES} pages`,
        );

      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
        }),
        { abortSignal: AbortSignal.timeout(LIST_PAGE_TIMEOUT_MILLISECONDS) },
      );

      for (const entry of page.Contents ?? []) {
        const parsed = storedObjectSchema.safeParse(entry);
        if (parsed.success)
          objects.push({
            key: parsed.data.Key,
            lastModified: parsed.data.LastModified,
          });
      }

      continuationToken = page.NextContinuationToken;

      // A token that comes again would request the same pages without an end
      if (continuationToken !== undefined) {
        if (seenContinuationTokens.has(continuationToken))
          throw new Error("The storage gave the same continuation token again");

        seenContinuationTokens.add(continuationToken);
      }
    } while (continuationToken);

    return objects;
  },

  deleteObjects: async (keys) => {
    if (keys.length > MAXIMUM_STORAGE_DELETE_KEYS)
      throw new RangeError(
        `A delete takes at most ${MAXIMUM_STORAGE_DELETE_KEYS} keys, not ${keys.length}`,
      );
    if (keys.length === 0) return { failures: [] };

    const response = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
          Quiet: true,
        },
      }),
      { abortSignal: AbortSignal.timeout(DELETE_TIMEOUT_MILLISECONDS) },
    );

    return {
      failures: deleteErrorsSchema
        .parse(response.Errors ?? [])
        .map((error) => ({ key: error.Key, code: error.Code ?? null })),
    };
  },

  createUploadUrl: async ({ key, contentType, expiresInSeconds }) => {
    const getSignedUrl = await loadGetSignedUrl();

    return getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      }),
      {
        expiresIn: expiresInSeconds,
        // The presigner of the SDK leaves the content type out of the
        // signature by default. Signed, the bucket refuses an upload with a
        // different content type, thus the bucket serves the validated type.
        signableHeaders: new Set(["content-type"]),
      },
    );
  },

  createDownloadUrl: async ({
    key,
    contentType,
    contentDisposition,
    expiresInSeconds,
  }) => {
    const getSignedUrl = await loadGetSignedUrl();

    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        ResponseContentType: contentType,
        ResponseContentDisposition: contentDisposition,
      }),
      { expiresIn: expiresInSeconds },
    );
  },
});
