import { expect, test } from "vitest";
import {
  isAllowedImageMimeType,
  isAttachmentMimeType,
} from "./uploadConstraints.js";

/** Types that a browser can show as an active document or run as a script */
const SCRIPTABLE_MIME_TYPES = [
  "text/html",
  "text/xml",
  "text/xsl",
  "text/javascript",
  "application/xhtml+xml",
];

test.each([
  ...SCRIPTABLE_MIME_TYPES,
  "text/plain,text/html",
  "image/png,text/html",
  "text/plain;charset=utf-8",
  "TEXT/PLAIN",
  "image/tiff",
  "application/octet-stream",
  "",
])("refuses the MIME type %j", (mimeType) => {
  expect(isAttachmentMimeType(mimeType)).toBe(false);
  expect(isAllowedImageMimeType(mimeType)).toBe(false);
});

test.each([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
  "image/svg+xml",
])("accepts the attachment MIME type %j", (mimeType) => {
  expect(isAttachmentMimeType(mimeType)).toBe(true);
});

test.each([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/svg+xml",
])("accepts the image MIME type %j", (mimeType) => {
  expect(isAllowedImageMimeType(mimeType)).toBe(true);
});
