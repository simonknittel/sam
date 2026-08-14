/**
 * Markers `ts_headline` wraps around matched words in search snippets.
 * Control characters cannot occur in extracted page text, so splitting on
 * them is unambiguous (unlike HTML tags, which could appear literally).
 */
export const WIKI_SEARCH_MARK_START = "\u0001";
export const WIKI_SEARCH_MARK_END = "\u0002";

interface WikiSearchSnippetSegment {
  readonly text: string;
  readonly highlighted: boolean;
}

export const parseWikiSearchSnippet = (
  snippet: string,
): WikiSearchSnippetSegment[] => {
  const segments: WikiSearchSnippetSegment[] = [];

  for (const [index, part] of snippet.split(WIKI_SEARCH_MARK_START).entries()) {
    if (index === 0) {
      if (part) segments.push({ text: part, highlighted: false });
      continue;
    }

    const endIndex = part.indexOf(WIKI_SEARCH_MARK_END);
    if (endIndex === -1) {
      if (part) segments.push({ text: part, highlighted: false });
      continue;
    }

    const match = part.slice(0, endIndex);
    if (match) segments.push({ text: match, highlighted: true });

    const rest = part.slice(endIndex + 1);
    if (rest) segments.push({ text: rest, highlighted: false });
  }

  return segments;
};
