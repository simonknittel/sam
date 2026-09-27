import { describe, expect, test } from "vitest";
import {
  collectWikiUploadReferences,
  WikiUploadReferenceKind,
} from "./index.js";

describe("collectWikiUploadReferences", () => {
  test("collects the attachments and the images of all levels one time each", () => {
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
                  type: "image",
                  attrs: { src: "https://uploads.example.com/upload-2" },
                },
                {
                  type: "wikiAttachment",
                  attrs: { uploadId: "upload-1", fileName: "a.pdf" },
                },
              ],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "wikiFloatImage",
              attrs: { src: "http://localhost:8333/uploads/upload-3" },
            },
            { type: "text", text: "upload-4" },
          ],
        },
        {
          type: "image",
          attrs: { src: "https://uploads.example.com/upload-2" },
        },
      ],
    };

    expect(collectWikiUploadReferences(document)).toEqual([
      { uploadId: "upload-1", kind: WikiUploadReferenceKind.Attachment },
      { uploadId: "upload-2", kind: WikiUploadReferenceKind.Image },
      { uploadId: "upload-3", kind: WikiUploadReferenceKind.Image },
    ]);
  });

  test("keeps one upload that is an image and an attachment as two references", () => {
    expect(
      collectWikiUploadReferences({
        type: "doc",
        content: [
          { type: "image", attrs: { src: "https://example.com/upload-1" } },
          { type: "wikiAttachment", attrs: { uploadId: "upload-1" } },
        ],
      }),
    ).toEqual([
      { uploadId: "upload-1", kind: WikiUploadReferenceKind.Image },
      { uploadId: "upload-1", kind: WikiUploadReferenceKind.Attachment },
    ]);
  });

  /**
   * Only the database knows which uploads exist, thus an external image is
   * a candidate too. A data or relative source can never point at an upload.
   */
  test("takes the last path segment of each http(s) image source", () => {
    expect(
      collectWikiUploadReferences({
        type: "doc",
        content: [
          { type: "image", attrs: { src: "https://external.example.com/a/b" } },
          { type: "image", attrs: { src: "data:image/png;base64,AAAA" } },
          { type: "image", attrs: { src: "/relative/upload-1" } },
          { type: "image", attrs: { src: "https://example.com/" } },
          { type: "image", attrs: { src: "not a url" } },
          { type: "image", attrs: {} },
          { type: "image" },
        ],
      }),
    ).toEqual([{ uploadId: "b", kind: WikiUploadReferenceKind.Image }]);
  });

  test("ignores attachment cards without an upload id and invalid input", () => {
    expect(
      collectWikiUploadReferences({
        type: "doc",
        content: [
          { type: "wikiAttachment", attrs: { uploadId: "" } },
          { type: "wikiAttachment", attrs: {} },
          { type: "wikiAttachment" },
        ],
      }),
    ).toEqual([]);
    expect(collectWikiUploadReferences(null)).toEqual([]);
    expect(collectWikiUploadReferences("text")).toEqual([]);
  });
});
