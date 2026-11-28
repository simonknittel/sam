export enum SharingPopoverTab {
  Start = "start",
  Grants = "grants",
  /** One sub-tab for each runtime (`SharingPopoverRuntimeTab`) */
  Runtimes = "runtimes",
}

export enum SharingPopoverRuntimeTab {
  Browser = "browser",
  DesktopCompanion = "desktop_companion",
}

/** A sub-tab of the tab of the runtimes */
export interface SharingPopoverRuntimeLocation {
  readonly tab: SharingPopoverTab.Runtimes;
  readonly runtimeTab: SharingPopoverRuntimeTab;
}

/**
 * The place that a control UI or a link of the popover opens: a tab, and in
 * the tab of the runtimes a sub-tab
 */
export type SharingPopoverLocation =
  | { readonly tab: Exclude<SharingPopoverTab, SharingPopoverTab.Runtimes> }
  | SharingPopoverRuntimeLocation;

export const SHARING_POPOVER_TAB_LABELS: Readonly<
  Record<SharingPopoverTab, string>
> = {
  [SharingPopoverTab.Start]: "Start",
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

/**
 * The sub-tab of the browser runtime of this browser. It shows the sub-tab
 * of the game logs with the log folder.
 */
export const BROWSER_RUNTIME_LOCATION: SharingPopoverRuntimeLocation = {
  tab: SharingPopoverTab.Runtimes,
  runtimeTab: SharingPopoverRuntimeTab.Browser,
};
