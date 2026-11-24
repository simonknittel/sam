import {
  MAXIMUM_STORAGE_DELETE_KEYS,
  type FileStorage,
  type StorageDeleteFailure,
  type StoredObject,
} from "../src/context.js";

interface TestStorageOptions {
  readonly objects?: readonly StoredObject[];
  readonly failingDeleteKeys?: readonly string[];
  /**
   * The delete requests from this index (zero-based) on reject, like a bucket
   * that stops to answer
   */
  readonly rejectsDeleteFromRequest?: number;
}

const notInTheTests = async (): Promise<never> => {
  throw new Error("The test storage can only list and delete objects");
};

/** Also records a rejected request. A delete does not remove an object. */
export const createTestStorage = ({
  objects = [],
  failingDeleteKeys = [],
  rejectsDeleteFromRequest,
}: TestStorageOptions = {}) => {
  const deleteRequests: string[][] = [];

  const storage: FileStorage = {
    readObject: notInTheTests,
    copyObject: notInTheTests,
    getObjectSize: notInTheTests,
    listObjects: async () => [...objects],
    deleteObjects: async (keys) => {
      if (keys.length > MAXIMUM_STORAGE_DELETE_KEYS)
        throw new RangeError(
          `A delete takes at most ${MAXIMUM_STORAGE_DELETE_KEYS} keys`,
        );

      const requestIndex = deleteRequests.push([...keys]) - 1;
      if (
        rejectsDeleteFromRequest !== undefined &&
        requestIndex >= rejectsDeleteFromRequest
      )
        throw new Error("The bucket is not available");

      return {
        failures: keys
          .filter((key) => failingDeleteKeys.includes(key))
          .map((key): StorageDeleteFailure => ({ key, code: "InternalError" })),
      };
    },
    createUploadUrl: notInTheTests,
    createDownloadUrl: notInTheTests,
  };

  return { storage, deleteRequests };
};
