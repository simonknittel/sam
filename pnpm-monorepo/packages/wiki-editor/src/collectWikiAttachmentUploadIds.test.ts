import { describe, expect, test } from "vitest";
import { collectWikiAttachmentUploadIds } from "./index.js";

describe("collectWikiAttachmentUploadIds", () => {
  test("collects unique upload ids of attachment nodes", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "wikiAttachment",
          attrs: { uploadId: "upload-1", fileName: "a.pdf" },
        },
        {
          type: "wikiGrid",
          content: [
            {
              type: "wikiGridCell",
              content: [
                {
                  type: "wikiAttachment",
                  attrs: { uploadId: "upload-2", fileName: "b.pdf" },
                },
                {
                  type: "wikiAttachment",
                  attrs: { uploadId: "upload-1", fileName: "a.pdf" },
                },
              ],
            },
          ],
        },
        { type: "paragraph", content: [{ type: "text", text: "upload-3" }] },
        { type: "image", attrs: { src: "https://example.com/upload-4" } },
      ],
    };

    expect(collectWikiAttachmentUploadIds(document)).toEqual([
      "upload-1",
      "upload-2",
    ]);
  });

  test("ignores attachment nodes without an upload id and invalid input", () => {
    expect(
      collectWikiAttachmentUploadIds({
        type: "doc",
        content: [
          { type: "wikiAttachment", attrs: { uploadId: "" } },
          { type: "wikiAttachment", attrs: {} },
          { type: "wikiAttachment" },
        ],
      }),
    ).toEqual([]);
    expect(collectWikiAttachmentUploadIds(null)).toEqual([]);
    expect(collectWikiAttachmentUploadIds("text")).toEqual([]);
  });
});
