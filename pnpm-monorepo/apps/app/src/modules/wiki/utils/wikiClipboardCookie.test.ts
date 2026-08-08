import { describe, expect, test } from "vitest";
import {
  parseWikiClipboardCookie,
  serializeWikiClipboardCookie,
  WIKI_CLIPBOARD_COOKIE,
} from "./wikiClipboardCookie";

const entry = {
  pageId: "tz4a98xxat96iws9zmbrgj3a",
  includeChildren: true,
  title: "Öffentliche Übersicht; mit Sonderzeichen",
  childCount: 3,
};

describe("wikiClipboardCookie", () => {
  test("round-trips an entry through serialize and parse", () => {
    const serialized = serializeWikiClipboardCookie(entry);
    const cookieValue = serialized.split("; ")[0].split("=").slice(1).join("=");
    const documentCookie = `other=1; ${WIKI_CLIPBOARD_COOKIE}=${cookieValue}`;

    expect(parseWikiClipboardCookie(documentCookie)).toEqual(entry);
  });

  test("returns null without the cookie", () => {
    expect(parseWikiClipboardCookie("")).toBeNull();
    expect(parseWikiClipboardCookie("other=1; another=2")).toBeNull();
  });

  test("returns null for malformed values instead of throwing", () => {
    expect(
      parseWikiClipboardCookie(`${WIKI_CLIPBOARD_COOKIE}=not-json`),
    ).toBeNull();
    expect(
      parseWikiClipboardCookie(`${WIKI_CLIPBOARD_COOKIE}=%7B%22pageId%22%3A1%7D`),
    ).toBeNull();
    expect(
      parseWikiClipboardCookie(
        `${WIKI_CLIPBOARD_COOKIE}=${encodeURIComponent(
          JSON.stringify({ ...entry, pageId: "NOT A CUID" }),
        )}`,
      ),
    ).toBeNull();
  });
});
