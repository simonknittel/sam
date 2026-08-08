import { z } from "zod";

/**
 * Holds the page "copied" by the copy dialog until it is inserted somewhere
 * else. Client-managed: written by the copy dialog, read by the create-page
 * modal to offer the insert, cleared by a successful insert (server-side)
 * or the discard button. It stores only a reference plus display metadata —
 * the pages themselves are re-resolved with the viewer's then-current
 * permissions at insert time, so a stale or tampered cookie can't widen
 * access.
 */
export const WIKI_CLIPBOARD_COOKIE = "wiki_clipboard";

/** Readable in the global wiki and the event briefings */
export const WIKI_CLIPBOARD_COOKIE_PATH = "/app";

const CLIPBOARD_MAX_AGE_SECONDS = 60 * 60 * 24;

const schema = z.object({
  pageId: z.cuid2(),
  includeChildren: z.boolean(),
  /** Display only — the source is re-resolved at insert time */
  title: z.string().min(1).max(128),
  /** Display only — readable descendants at copy time, 0 without children */
  childCount: z.number().int().min(0).max(100_000),
});

export type WikiClipboardEntry = z.infer<typeof schema>;

export const serializeWikiClipboardCookie = (entry: WikiClipboardEntry) =>
  `${WIKI_CLIPBOARD_COOKIE}=${encodeURIComponent(JSON.stringify(entry))}; path=${WIKI_CLIPBOARD_COOKIE_PATH}; samesite=lax; max-age=${CLIPBOARD_MAX_AGE_SECONDS};`;

export const serializeWikiClipboardClearCookie = () =>
  `${WIKI_CLIPBOARD_COOKIE}=; path=${WIKI_CLIPBOARD_COOKIE_PATH}; samesite=lax; max-age=0;`;

/** Parses `document.cookie`; a malformed value counts as an empty clipboard */
export const parseWikiClipboardCookie = (
  cookieString: string,
): WikiClipboardEntry | null => {
  const rawValue = cookieString
    .split("; ")
    .find((cookie) => cookie.startsWith(`${WIKI_CLIPBOARD_COOKIE}=`))
    ?.slice(WIKI_CLIPBOARD_COOKIE.length + 1);
  if (!rawValue) return null;

  try {
    const result = schema.safeParse(JSON.parse(decodeURIComponent(rawValue)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
};
