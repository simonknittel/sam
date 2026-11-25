export enum SharingPopoverTab {
  Start = "start",
  Browser = "browser",
  Status = "status",
  Grants = "grants",
}

export const SHARING_POPOVER_TAB_LABELS: Readonly<
  Record<SharingPopoverTab, string>
> = {
  [SharingPopoverTab.Start]: "Start",
  [SharingPopoverTab.Browser]: "Runtime: Browser",
  [SharingPopoverTab.Status]: "Status",
  [SharingPopoverTab.Grants]: "Freigaben",
};
