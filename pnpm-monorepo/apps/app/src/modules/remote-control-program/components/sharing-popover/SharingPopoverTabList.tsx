import TabList from "@/modules/common/components/tabs/TabList";
import type { ReactNode, Ref } from "react";

interface Props {
  /** For example to move the focus to the selected tab */
  readonly ref?: Ref<HTMLDivElement>;
  readonly children: ReactNode;
}

/**
 * The tabs or the sub-tabs of the sharing popover. On a phone, the tabs are
 * smaller, thus all tabs of a list fit into one row.
 */
export const SharingPopoverTabList = ({ ref, children }: Props) => {
  return (
    <div
      ref={ref}
      className="max-sm:[&_[role=tab]]:px-1.5 max-sm:[&_[role=tab]]:text-xs"
    >
      <TabList>{children}</TabList>
    </div>
  );
};
