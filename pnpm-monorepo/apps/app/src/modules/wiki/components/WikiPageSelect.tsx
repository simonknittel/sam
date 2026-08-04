"use client";

import { Select } from "@/modules/common/components/form/Select";
import type { ComponentProps } from "react";
import {
  wikiPageOptionLabel,
  type WikiPageTargetOption,
} from "../utils/getWikiPageTargets";

interface Props extends Omit<ComponentProps<typeof Select>, "children"> {
  /** In depth-first tree order, e.g. from getManageableWikiPageTargets */
  readonly targets: readonly WikiPageTargetOption[];
  /** Label of the empty-value ("") option; omit to render none */
  readonly emptyOptionLabel?: string;
}

/**
 * Page select whose options represent the page hierarchy (indentation +
 * branch marker). Shared by the create/move/duplicate dialogs, the wiki
 * settings and the page-index config so they all read the same.
 */
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
