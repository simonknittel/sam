import { WikiPageUploadKind } from "@sam-monorepo/database/browser";
import type { Prisma } from "@sam-monorepo/database/client";
import { describe, expect, test } from "vitest";
import {
  MAX_WIKI_UPLOAD_LINK_CANDIDATES,
  replaceWikiPageUploadLinks,
} from "./wikiUploadLinks.js";

const PAGE_ID = "page";

/** An id that Prisma generated for an upload */
const UPLOAD_ID = "cmt0ajpza000004lau9b01ob7";

const createUploadId = (index: number) => `c${String(index).padStart(24, "0")}`;

/**
 * The transaction of a page without upload links. Each upload that the
 * helper looks up exists.
 */
const createTransaction = () => {
  const lookedUpUploadIds: string[][] = [];
  const createdLinks: unknown[] = [];
  const transaction = {
    upload: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) => {
        lookedUpUploadIds.push(where.id.in);
        return where.id.in.map((id) => ({ id }));
      },
    },
    wikiPageUpload: {
      findMany: async () => [],
      deleteMany: async () => ({ count: 0 }),
      createMany: async ({ data }: { data: unknown[] }) => {
        createdLinks.push(...data);
        return { count: data.length };
      },
    },
  };

  return {
    transaction: transaction as unknown as Prisma.TransactionClient,
    lookedUpUploadIds,
    createdLinks,
  };
};

describe("replaceWikiPageUploadLinks", () => {
  test("looks up only the candidates with the format of an upload id", async () => {
    const { transaction, lookedUpUploadIds, createdLinks } =
      createTransaction();

    await replaceWikiPageUploadLinks(transaction, PAGE_ID, [
      { uploadId: "photo.png", kind: WikiPageUploadKind.IMAGE },
      { uploadId: "upload-1", kind: WikiPageUploadKind.ATTACHMENT },
      { uploadId: UPLOAD_ID.toUpperCase(), kind: WikiPageUploadKind.IMAGE },
      { uploadId: UPLOAD_ID, kind: WikiPageUploadKind.IMAGE },
    ]);

    expect(lookedUpUploadIds).toEqual([[UPLOAD_ID]]);
    expect(createdLinks).toEqual([
      { pageId: PAGE_ID, uploadId: UPLOAD_ID, kind: WikiPageUploadKind.IMAGE },
    ]);
  });

  test("looks up nothing when no candidate has the format of an upload id", async () => {
    const { transaction, lookedUpUploadIds, createdLinks } =
      createTransaction();

    await replaceWikiPageUploadLinks(transaction, PAGE_ID, [
      { uploadId: "external-image", kind: WikiPageUploadKind.IMAGE },
    ]);

    expect(lookedUpUploadIds).toEqual([]);
    expect(createdLinks).toEqual([]);
  });

  test("looks up the uploads up to the cap, in document order", async () => {
    const { transaction, lookedUpUploadIds, createdLinks } =
      createTransaction();
    const imageCandidates = [
      ...Array(MAX_WIKI_UPLOAD_LINK_CANDIDATES + 10).keys(),
    ].map((index) => ({
      uploadId: createUploadId(index),
      kind: WikiPageUploadKind.IMAGE,
    }));
    const firstUploadAsAttachment = {
      uploadId: createUploadId(0),
      kind: WikiPageUploadKind.ATTACHMENT,
    };

    await replaceWikiPageUploadLinks(transaction, PAGE_ID, [
      ...imageCandidates,
      firstUploadAsAttachment,
    ]);

    expect(lookedUpUploadIds).toEqual([
      imageCandidates
        .slice(0, MAX_WIKI_UPLOAD_LINK_CANDIDATES)
        .map(({ uploadId }) => uploadId),
    ]);
    expect(createdLinks).toHaveLength(MAX_WIKI_UPLOAD_LINK_CANDIDATES + 1);
    expect(createdLinks).toContainEqual({
      pageId: PAGE_ID,
      ...firstUploadAsAttachment,
    });
  });
});
