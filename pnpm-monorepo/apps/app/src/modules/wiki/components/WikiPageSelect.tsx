"use client";

import { Select } from "@/modules/common/components/form/Select";
import type { ComponentProps } from "react";
import {
  wikiPageOptionLabel,
  type WikiPageTargetOption,
} from "../utils/getWikiPageTargets";

interface Props extends Omit<ComponentProps<typeof Select>, "children"> {
  /** In depth-first tree order */
  readonly targets: readonly WikiPageTargetOption[];
  readonly emptyOptionLabel?: string;
}

export const WikiPageSelect = ({
  targets,
  emptyOptionLabel,
  ...selectProps
}: Props) => {
  return (
    <Select {...selectProps}>
      {emptyOptionLabel !== undefined && (
        <option value="">{emptyOptionLabel}</option>
      )}
      {targets.map((target) => (
        <option key={target.id} value={target.id}>
          {wikiPageOptionLabel(target)}
        </option>
      ))}
    </Select>
  );
};
