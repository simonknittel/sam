import type { ReactNode } from "react";
import {
  ENTRY_CATEGORY_TITLES,
  ENTRY_TYPES_BY_CATEGORY,
  EntryCategory,
  type EntryType,
} from "../utils/PATTERNS";

interface Props {
  /** The types to show. A category without one of them does not show. */
  readonly types: readonly EntryType[];
  readonly children: (type: EntryType) => ReactNode;
}

/** The given entry types, grouped under the heading of their category. */
export const EntryTypeGroups = ({ types, children }: Props) => {
  return (
    <>
      {Object.values(EntryCategory).map((category) => {
        const categoryTypes = ENTRY_TYPES_BY_CATEGORY[category].filter(
          (type) => types.includes(type),
        );
        if (categoryTypes.length <= 0) return null;

        return (
          <div key={category} className="flex flex-col gap-1">
            <h4 className="font-mono uppercase text-xs text-white/40">
              {ENTRY_CATEGORY_TITLES[category]}
            </h4>

            {categoryTypes.map((type) => children(type))}
          </div>
        );
      })}
    </>
  );
};
