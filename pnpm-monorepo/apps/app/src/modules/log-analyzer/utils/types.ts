import type { EntryType } from "./PATTERNS";

export interface RawMatch {
  readonly type: EntryType;
  readonly isoDate: string;
  readonly fullMatch: string;
  readonly groups: Record<string, string>;
}

export interface ResultMessage {
  readonly id: number;
  readonly matches: RawMatch[];
}
