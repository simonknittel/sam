import { describe, expect, test } from "vitest";
import { collectWikiImageUploadIds, getWikiImageUploadId } from "./index.js";

const PUBLIC_HOST = "uploads.example.com";
const PUBLIC_BASE_URL = "http://localhost:8333/uploads";

describe("getWikiImageUploadId", () => {
  test("extracts the upload id from a public bucket src", () => {
    expect(
      getWikiImageUploadId(`https://${PUBLIC_HOST}/upload-1`, PUBLIC_HOST),
    ).toBe("upload-1");
  });

  test("extracts the upload id when the public base is a full URL with a bucket path", () => {
    expect(
      getWikiImageUploadId(`${PUBLIC_BASE_URL}/upload-1`, PUBLIC_BASE_URL),
    ).toBe("upload-1");
  });

  test("rejects srcs not matching a full-URL public base", () => {
    expect(
      getWikiImageUploadId(
        "http://localhost:8333/other-bucket/upload-1",
        PUBLIC_BASE_URL,
      ),
    ).toBeNull();
    expect(
      getWikiImageUploadId(
        "http://localhost:9000/uploads/upload-1",
        PUBLIC_BASE_URL,
      ),
    ).toBeNull();
    expect(
      getWikiImageUploadId(
        "https://localhost:8333/uploads/upload-1",
        PUBLIC_BASE_URL,
      ),
    ).toBeNull();
    expect(
      getWikiImageUploadId(
        `${PUBLIC_BASE_URL}/nested/upload-1`,
        PUBLIC_BASE_URL,
      ),
    ).toBeNull();
    expect(getWikiImageUploadId(PUBLIC_BASE_URL, PUBLIC_BASE_URL)).toBeNull();
    expect(
      getWikiImageUploadId(`${PUBLIC_BASE_URL}/`, PUBLIC_BASE_URL),
    ).toBeNull();
  });

  test("rejects srcs not pointing at an uploaded object", () => {
    expect(
      getWikiImageUploadId("https://other.example.com/upload-1", PUBLIC_HOST),
    ).toBeNull();
    expect(
      getWikiImageUploadId(`http://${PUBLIC_HOST}/upload-1`, PUBLIC_HOST),
    ).toBeNull();
    expect(
      getWikiImageUploadId(`https://${PUBLIC_HOST}/nested/path`, PUBLIC_HOST),
    ).toBeNull();
    expect(
      getWikiImageUploadId(`https://${PUBLIC_HOST}/`, PUBLIC_HOST),
    ).toBeNull();
    expect(getWikiImageUploadId("not a url", PUBLIC_HOST)).toBeNull();
    expect(getWikiImageUploadId(null, PUBLIC_HOST)).toBeNull();
    expect(
      getWikiImageUploadId(`https://${PUBLIC_HOST}/upload-1`, ""),
    ).toBeNull();
  });
});

describe("collectWikiImageUploadIds", () => {
  test("collects unique upload ids of uploaded images", () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "image",
          attrs: { src: `https://${PUBLIC_HOST}/upload-1`, alt: "a.png" },
        },
        {
          type: "wikiGrid",
          content: [
            {
              type: "wikiGridCell",
              content: [
                {
                  type: "image",
                  attrs: { src: `https://${PUBLIC_HOST}/upload-2` },
                },
                {
                  type: "image",
                  attrs: { src: `https://${PUBLIC_HOST}/upload-1` },
                },
              ],
            },
          ],
        },
        {
          type: "image",
          attrs: { src: "https://external.example.com/photo.jpg" },
        },
        {
          type: "wikiAttachment",
          attrs: { uploadId: "upload-3", fileName: "c.pdf" },
        },
      ],
    };

    expect(collectWikiImageUploadIds(document, PUBLIC_HOST)).toEqual([
      "upload-1",
      "upload-2",
    ]);
  });

  test("ignores image nodes without a src and invalid input", () => {
    expect(
      collectWikiImageUploadIds(
        {
          type: "doc",
          content: [{ type: "image", attrs: {} }, { type: "image" }],
        },
        PUBLIC_HOST,
      ),
    ).toEqual([]);
    expect(collectWikiImageUploadIds(null, PUBLIC_HOST)).toEqual([]);
  });
});
