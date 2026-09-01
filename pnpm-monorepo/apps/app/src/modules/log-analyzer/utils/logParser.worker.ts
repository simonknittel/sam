import { EntryType, PATTERNS } from "./PATTERNS";
import type { RawMatch, ResultMessage } from "./types";

interface ParseMessage {
  readonly id: number;
  readonly fileContents: string[];
}

self.onmessage = (event: MessageEvent<ParseMessage>) => {
  const { id, fileContents } = event.data;

  const matches: RawMatch[] = [];

  for (const fileContent of fileContents) {
    for (const type of Object.values(EntryType)) {
      const regexMatches = fileContent.matchAll(PATTERNS[type].regex);
      for (const match of regexMatches) {
        if (!match.groups) continue;

        matches.push({
          type,
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
