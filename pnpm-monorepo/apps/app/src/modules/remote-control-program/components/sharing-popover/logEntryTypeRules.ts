import { SORTED_ENTRY_TYPES } from "@/modules/log-analyzer/utils/PATTERNS";
import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";

/** Each version of a type has the value of the rule of its oldest version */
export type LogEntryTypeRules = Readonly<Record<LogAnalyzerEntryType, boolean>>;

/** The types that are on. A list shows only the newest version of a type. */
export const countLogEntryTypesThatAreOn = (rules: LogEntryTypeRules) =>
  SORTED_ENTRY_TYPES.filter((type) => rules[type]).length;

export const formatLogEntryTypeCount = (rules: LogEntryTypeRules) =>
  `${countLogEntryTypesThatAreOn(rules)} von ${SORTED_ENTRY_TYPES.length}`;
