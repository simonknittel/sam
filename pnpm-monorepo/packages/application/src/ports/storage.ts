export interface StoredObject {
  readonly key: string;
  readonly lastModified: Date;
}

export interface StorageDeleteFailure {
  readonly key: string;
  readonly code: string | null;
}

/** The limit of one S3 `DeleteObjects` request */
export const MAXIMUM_STORAGE_DELETE_KEYS = 1_000;

/**
 * The object storage of the uploads. The key of an object is the id of its
 * upload. Each operation throws on a storage error.
 */
export interface FileStorage {
  /**
   * The bytes, or null when the object is empty or larger than
   * `maximumBytes`
   */
  readonly readObject: (
    key: string,
    options: {
      readonly maximumBytes: number;
      /**
       * Only these bytes (both inclusive). `maximumBytes` applies to the size
       * of the whole object.
       */
      readonly byteRange?: { readonly first: number; readonly last: number };
      /** Default 10 000 (an interactive save waits for the read) */
      readonly timeoutMilliseconds?: number;
    },
  ) => Promise<Uint8Array | null>;
  readonly copyObject: (copy: {
    readonly sourceKey: string;
    readonly targetKey: string;
    readonly contentType: string;
  }) => Promise<void>;
  /**
   * The size in bytes, or null when the storage gives no size. Throws when
   * the object does not exist.
   */
  readonly getObjectSize: (key: string) => Promise<number | null>;
  /**
   * All objects, all pages. The list leaves out the entries without a key or
   * a modification time.
   */
  readonly listObjects: () => Promise<StoredObject[]>;
  /**
   * Deletes at most `MAXIMUM_STORAGE_DELETE_KEYS` keys, and throws a
   * `RangeError` for more. Gives the keys that the storage did not delete.
   */
  readonly deleteObjects: (
    keys: readonly string[],
  ) => Promise<{ readonly failures: StorageDeleteFailure[] }>;
  /**
   * A presigned PUT URL. The upload must send exactly this `Content-Type`,
   * because it is part of the signature.
   */
  readonly createUploadUrl: (upload: {
    readonly key: string;
    readonly contentType: string;
    readonly expiresInSeconds: number;
  }) => Promise<string>;
  /** A presigned GET URL that sets the headers of the response */
  readonly createDownloadUrl: (download: {
    readonly key: string;
    readonly contentType: string;
    readonly contentDisposition: string;
    readonly expiresInSeconds: number;
  }) => Promise<string>;
}
