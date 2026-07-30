import { PATTERN_CONFIGS } from "./PATTERNS";
import type { RawMatch, ResultMessage } from "./types";

interface ParseMessage {
  readonly id: number;
  readonly fileContents: string[];
}

const parsedPatternsCache = new Map<string, { regex: RegExp; key: string }>();

self.onmessage = (event: MessageEvent<ParseMessage>) => {
  const { id, fileContents } = event.data;

  // Rebuild patterns from configs (regex can't be serialized, but source+flags can)
  const parsedPatterns: { regex: RegExp; key: string }[] = PATTERN_CONFIGS.map(
    (p) => {
      const cacheKey = `${p.regexSource}@${p.regexFlags}`;
      const cached = parsedPatternsCache.get(cacheKey);
      if (cached) return cached;

      const parsed = {
        regex: new RegExp(p.regexSource, p.regexFlags),
        key: p.key,
      };
      parsedPatternsCache.set(cacheKey, parsed);
      return parsed;
    },
  );

  const matches: RawMatch[] = [];

  for (const fileContent of fileContents) {
    for (const { key, regex } of parsedPatterns) {
      const regexMatches = fileContent.matchAll(regex);
      for (const match of regexMatches) {
        if (!match.groups) continue;

        matches.push({
          patternKey: key,
          isoDate: match.groups.isoDate,
          fullMatch: match[0],
          groups: match.groups,
        });
      }
    }
  }

  const result: ResultMessage = { id, matches };
  self.postMessage(result);
};
