export interface RawMatch {
  readonly patternKey: string;
  readonly isoDate: string;
  readonly fullMatch: string;
  readonly groups: Record<string, string>;
}

export interface ResultMessage {
  readonly id: number;
  readonly matches: RawMatch[];
}

export interface PatternConfig {
  readonly key: string;
  readonly regexSource: string;
  readonly regexFlags: string;
}
