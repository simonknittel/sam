import { findPrecedingIsoDate } from "./findPrecedingIsoDate";
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
      const { regex, takesTimeOfPrecedingLine } = PATTERNS[type];

      const regexMatches = fileContent.matchAll(regex);
      for (const match of regexMatches) {
        if (!match.groups) continue;

        const isoDate = takesTimeOfPrecedingLine
          ? findPrecedingIsoDate(fileContent, match.index)
          : match.groups.isoDate;
        if (!isoDate) continue;

        matches.push({
          type,
          isoDate,
          fullMatch: match[0],
          groups: match.groups,
        });
      }
    }
  }

  const result: ResultMessage = { id, matches };
  self.postMessage(result);
};
