import type {
  CopyObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { MAXIMUM_STORAGE_DELETE_KEYS } from "@sam-monorepo/application";
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
  type MockInstance,
} from "vitest";
import { createS3Client } from "./createS3Client.js";
import { createS3Storage } from "./createS3Storage.js";

const BUCKET_NAME = "uploads";

/** One hour, the lifetime of the upload URLs of the app */
const UPLOAD_URL_EXPIRY_SECONDS = 3_600;

type Body = {
  readonly transformToByteArray: () => Promise<Uint8Array>;
};

const createBody = (bytes: Uint8Array): Body => ({
  transformToByteArray: vi.fn(async () => bytes),
});

type Send = (
  command: { readonly input: unknown },
  options?: { readonly abortSignal?: AbortSignal },
) => Promise<unknown>;

/**
 * A storage on a real client, thus the presigned URLs get a real signature.
 * The client answers the requests with the given outputs, one output for
 * each request, and sends nothing to the network.
 */
const createStorage = (...outputs: object[]) => {
  const client = createS3Client({
    accountId: "account",
    credentials: {
      accessKeyId: "test-access-key-id",
      secretAccessKey: "test-secret-access-key",
    },
  });
  const send = vi.spyOn(client, "send") as unknown as MockInstance<Send>;
  send.mockRejectedValue(new Error("The test gives no output for a request"));
  for (const output of outputs) send.mockResolvedValueOnce(output);

  const storage = createS3Storage({ client, bucketName: BUCKET_NAME });

  return { storage, send };
};

const getInput = (send: MockInstance<Send>, callIndex = 0) =>
  send.mock.calls[callIndex]?.[0].input;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("readObject", () => {
  test("gives the bytes of the object", async () => {
    const { storage, send } = createStorage({
      Body: createBody(new Uint8Array([1, 2, 3])),
      ContentLength: 3,
    });

    const bytes = await storage.readObject("upload-1", { maximumBytes: 10 });

    expect(bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(getInput(send) as GetObjectCommand["input"]).toEqual({
      Bucket: BUCKET_NAME,
      Key: "upload-1",
    });
  });

  test("gives null for an object that the declared length shows as too large, without a read", async () => {
    const body = createBody(new Uint8Array([1, 2, 3]));
    const { storage } = createStorage({ Body: body, ContentLength: 11 });

    const bytes = await storage.readObject("upload-1", { maximumBytes: 10 });

    expect(bytes).toBeNull();
    expect(body.transformToByteArray).not.toHaveBeenCalled();
  });

  test("gives null for an object that is larger than its declared length", async () => {
    const { storage } = createStorage({
      Body: createBody(new Uint8Array(11)),
    });

    const bytes = await storage.readObject("upload-1", { maximumBytes: 10 });

    expect(bytes).toBeNull();
  });

  test("gives null for an empty object", async () => {
    const { storage } = createStorage({
      Body: createBody(new Uint8Array()),
      ContentLength: 0,
    });

    const bytes = await storage.readObject("upload-1", { maximumBytes: 10 });

    expect(bytes).toBeNull();
  });

  test("gives null for a byte range of an object whose whole size is too large", async () => {
    const body = createBody(new Uint8Array([1, 2, 3]));
    const { storage, send } = createStorage({
      Body: body,
      // The length of the range, not of the whole object
      ContentLength: 3,
      ContentRange: "bytes 0-2/11",
    });

    const bytes = await storage.readObject("upload-1", {
      maximumBytes: 10,
      byteRange: { first: 0, last: 2 },
    });

    expect(bytes).toBeNull();
    expect(body.transformToByteArray).not.toHaveBeenCalled();
    expect(getInput(send) as GetObjectCommand["input"]).toEqual({
      Bucket: BUCKET_NAME,
      Key: "upload-1",
      Range: "bytes=0-2",
    });
  });
});

describe("copyObject", () => {
  test("copies the object within the bucket and replaces its metadata", async () => {
    const { storage, send } = createStorage({});

    await storage.copyObject({
      sourceKey: "upload-1",
      targetKey: "upload-2",
      contentType: "image/png",
    });

    expect(getInput(send) as CopyObjectCommand["input"]).toEqual({
      Bucket: BUCKET_NAME,
      CopySource: "uploads/upload-1",
      Key: "upload-2",
      ContentType: "image/png",
      MetadataDirective: "REPLACE",
    });
  });
});

describe("getObjectSize", () => {
  test("gives the size of the object, or null when the storage gives no size", async () => {
    const { storage } = createStorage({ ContentLength: 1_234 }, {});

    expect(await storage.getObjectSize("upload-1")).toBe(1_234);
    expect(await storage.getObjectSize("upload-1")).toBeNull();
  });
});

describe("listObjects", () => {
  test("follows the continuation tokens and leaves out an entry without a modification time", async () => {
    const lastModified = new Date("2026-06-15T10:00:00.000Z");
    const { storage, send } = createStorage(
      {
        Contents: [{ Key: "upload-1", LastModified: lastModified }],
        NextContinuationToken: "token-1",
      },
      {
        Contents: [{ Key: "upload-2" }],
        NextContinuationToken: "token-2",
      },
      { Contents: [{ Key: "upload-3", LastModified: lastModified }] },
    );

    const objects = await storage.listObjects();

    expect(objects).toEqual([
      { key: "upload-1", lastModified },
      { key: "upload-3", lastModified },
    ]);
    expect(
      [0, 1, 2].map(
        (callIndex) =>
          (getInput(send, callIndex) as ListObjectsV2Command["input"])
            .ContinuationToken,
      ),
    ).toEqual([undefined, "token-1", "token-2"]);
  });

  test("throws when a continuation token comes again", async () => {
    const { storage, send } = createStorage(
      { NextContinuationToken: "token-a" },
      { NextContinuationToken: "token-b" },
      { NextContinuationToken: "token-a" },
    );

    await expect(storage.listObjects()).rejects.toThrow(
      "The storage gave the same continuation token again",
    );
    expect(send).toHaveBeenCalledTimes(3);
  });
});

describe("deleteObjects", () => {
  test("gives the keys that the storage did not delete", async () => {
    const { storage, send } = createStorage({
      Errors: [{ Key: "upload-2", Code: "InternalError" }, { Key: "upload-3" }],
    });

    const result = await storage.deleteObjects([
      "upload-1",
      "upload-2",
      "upload-3",
    ]);

    expect(result).toEqual({
      failures: [
        { key: "upload-2", code: "InternalError" },
        { key: "upload-3", code: null },
      ],
    });
    expect(getInput(send) as DeleteObjectsCommand["input"]).toEqual({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: [
          { Key: "upload-1" },
          { Key: "upload-2" },
          { Key: "upload-3" },
        ],
        Quiet: true,
      },
    });
  });

  test("sends nothing for no keys, and refuses more keys than one request takes", async () => {
    const { storage, send } = createStorage();

    await expect(storage.deleteObjects([])).resolves.toEqual({ failures: [] });
    await expect(
      storage.deleteObjects(
        Array.from(
          { length: MAXIMUM_STORAGE_DELETE_KEYS + 1 },
          (unused, index) => `upload-${index}`,
        ),
      ),
    ).rejects.toBeInstanceOf(RangeError);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("presigned URLs", () => {
  test("the upload URL signs the content type and holds no checksum", async () => {
    const { storage, send } = createStorage();

    const url = new URL(
      await storage.createUploadUrl({
        key: "upload-1",
        contentType: "image/png",
        expiresInSeconds: UPLOAD_URL_EXPIRY_SECONDS,
      }),
    );

    expect(url.host).toBe(`${BUCKET_NAME}.account.r2.cloudflarestorage.com`);
    expect(url.pathname).toBe("/upload-1");
    expect(url.searchParams.get("X-Amz-Expires")).toBe(
      String(UPLOAD_URL_EXPIRY_SECONDS),
    );
    expect(url.searchParams.get("X-Amz-SignedHeaders")?.split(";")).toContain(
      "content-type",
    );
    // See `createS3Client()`
    expect(
      [...url.searchParams.keys()].filter((name) =>
        name.toLowerCase().includes("checksum"),
      ),
    ).toEqual([]);
    expect(send).not.toHaveBeenCalled();
  });

  test("the download URL sets the headers of the response", async () => {
    const { storage } = createStorage();

    const url = new URL(
      await storage.createDownloadUrl({
        key: "upload-1",
        contentType: "application/pdf",
        contentDisposition: "attachment; filename*=UTF-8''report.pdf",
        expiresInSeconds: 300,
      }),
    );

    expect(url.searchParams.get("response-content-type")).toBe(
      "application/pdf",
    );
    expect(url.searchParams.get("response-content-disposition")).toBe(
      "attachment; filename*=UTF-8''report.pdf",
    );
  });
});

test("each request has a timeout", async () => {
  const { storage, send } = createStorage(
    { Body: createBody(new Uint8Array([1])), ContentLength: 1 },
    {},
    { ContentLength: 1 },
    { Contents: [] },
    {},
  );

  await storage.readObject("upload-1", { maximumBytes: 10 });
  await storage.copyObject({
    sourceKey: "upload-1",
    targetKey: "upload-2",
    contentType: "image/png",
  });
  await storage.getObjectSize("upload-1");
  await storage.listObjects();
  await storage.deleteObjects(["upload-1"]);

  expect(send).toHaveBeenCalledTimes(5);
  for (const [, options] of send.mock.calls)
    expect(options?.abortSignal).toBeInstanceOf(AbortSignal);
});
