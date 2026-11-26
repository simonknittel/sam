export enum SharingPopoverTab {
  Start = "start",
  Status = "status",
  Grants = "grants",
  /** One sub-tab for each runtime (`SharingPopoverRuntimeTab`) */
  Runtimes = "runtimes",
}

export enum SharingPopoverRuntimeTab {
  Browser = "browser",
  DesktopCompanion = "desktop_companion",
}

/**
 * The place that a control UI or a link of the popover opens: a tab, and the
 * sub-tab in the tab of the runtimes
 */
export type SharingPopoverLocation =
  | { readonly tab: Exclude<SharingPopoverTab, SharingPopoverTab.Runtimes> }
  | {
      readonly tab: SharingPopoverTab.Runtimes;
      readonly runtimeTab: SharingPopoverRuntimeTab;
    };

export const SHARING_POPOVER_TAB_LABELS: Readonly<
  Record<SharingPopoverTab, string>
> = {
  [SharingPopoverTab.Start]: "Start",
  [SharingPopoverTab.Status]: "Status",
  [SharingPopoverTab.Grants]: "Freigaben",
  [SharingPopoverTab.Runtimes]: "Runtimes",
};

export const SHARING_POPOVER_RUNTIME_TAB_LABELS: Readonly<
  Record<SharingPopoverRuntimeTab, string>
> = {
  [SharingPopoverRuntimeTab.Browser]: "Browser",
  [SharingPopoverRuntimeTab.DesktopCompanion]: "Desktop Companion",
};

/** For example "Runtimes › Browser" */
export const getSharingPopoverLocationLabel = (
  location: SharingPopoverLocation,
) =>
  location.tab === SharingPopoverTab.Runtimes
    ? `${SHARING_POPOVER_TAB_LABELS[location.tab]} › ${SHARING_POPOVER_RUNTIME_TAB_LABELS[location.runtimeTab]}`
    : SHARING_POPOVER_TAB_LABELS[location.tab];

/** The browser runtime of this browser, for example for the log folder */
export const BROWSER_RUNTIME_LOCATION: SharingPopoverLocation = {
  tab: SharingPopoverTab.Runtimes,
  runtimeTab: SharingPopoverRuntimeTab.Browser,
};
