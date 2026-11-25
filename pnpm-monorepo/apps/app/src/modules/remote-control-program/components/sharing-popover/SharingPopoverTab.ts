export enum SharingPopoverTab {
  Start = "start",
  Status = "status",
  Grants = "grants",
  Browser = "browser",
}

export const SHARING_POPOVER_TAB_LABELS: Readonly<
  Record<SharingPopoverTab, string>
> = {
  [SharingPopoverTab.Start]: "Start",
  [SharingPopoverTab.Status]: "Status",
  [SharingPopoverTab.Grants]: "Freigaben",
  [SharingPopoverTab.Browser]: "Runtime: Browser",
};
