import { ConnectorId } from "@sam-monorepo/domain";

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
  /**
   * The location opens the part of this connector in the sub-tab. Each part
   * is closed by default: only a link that names its connector opens it.
   */
  readonly connector?: ConnectorId;
}

/**
 * The place that a control UI or a link of the popover opens: a tab, and in
 * the tab of the runtimes a sub-tab and the part of a connector
 */
export type SharingPopoverLocation =
  | { readonly tab: Exclude<SharingPopoverTab, SharingPopoverTab.Runtimes> }
  | SharingPopoverRuntimeLocation;

/** The open parts of the connectors in the sub-tabs of the runtimes */
export type ExpandedConnectors = Readonly<
  Partial<Record<ConnectorId, boolean>>
>;

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

/** The sub-tab of the browser runtime of this browser, with all parts closed */
export const BROWSER_RUNTIME_LOCATION: SharingPopoverRuntimeLocation = {
  tab: SharingPopoverTab.Runtimes,
  runtimeTab: SharingPopoverRuntimeTab.Browser,
};

/** The open part of the log file connector in the sub-tab of the browser, with the log folder */
export const LOG_FOLDER_LOCATION: SharingPopoverRuntimeLocation = {
  ...BROWSER_RUNTIME_LOCATION,
  connector: ConnectorId.LogFile,
};
