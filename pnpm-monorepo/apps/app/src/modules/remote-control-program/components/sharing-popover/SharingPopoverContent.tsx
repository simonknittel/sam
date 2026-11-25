"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Note from "@/modules/common/components/Note";
import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import {
  TabsProvider,
  useTabsContext,
} from "@/modules/common/components/tabs/TabsContext";
import { useEffect, useRef, type RefObject } from "react";
import { flushSync } from "react-dom";
import { LogFolderState } from "../../runtime/types";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { SESSION_EXPIRED_TEXT } from "../../utils/remoteControlProgramTexts";
import { BrowserSettingsSection } from "./BrowserSettingsSection";
import { SharedWithOthersSection } from "./SharedWithOthersSection";
import { useOlderEntriesRequest } from "./SharingPopoverProvider";
import {
  SHARING_POPOVER_TAB_LABELS,
  SharingPopoverTab,
} from "./SharingPopoverTab";
import { StartSection } from "./StartSection";
import { StatusSection } from "./StatusSection";
import { useSharingPopoverQuery } from "./useSharingPopoverQuery";
import { SHARING_POPOVER_TITLE } from "./useSharingPopoverTrigger";

type ReadError = NonNullable<
  ReturnType<typeof useSharingPopoverQuery>["error"]
>;

/** The text of a failed read of the data of the server */
const getReadErrorText = ({ data, message }: ReadError) => {
  if (data?.code === "UNAUTHORIZED") return SESSION_EXPIRED_TEXT;
  // The procedure gives a German text (see `getSharingPopover`)
  if (data?.code === "FORBIDDEN") return message;
  return "Der Status konnte nicht geladen werden.";
};

interface Props {
  /** For example the Log Analyzer asks for the log folder */
  readonly isOpenedByControlUi: boolean;
}

/**
 * The content of the sharing popover in the top bar and in the bottom sheet
 * of the mobile action bar. The tab of this browser does not wait for the
 * data of the server.
 */
export const SharingPopoverContent = ({ isOpenedByControlUi }: Props) => {
  const query = useSharingPopoverQuery();
  const { data } = query;
  const folderState = useBrowserRuntime()?.state.folder.state;
  const tabListRef = useRef<HTMLDivElement>(null);

  const getInitialActiveTab = () => {
    if (isOpenedByControlUi) return SharingPopoverTab.Browser;
    return folderState === LogFolderState.NotSelected ||
      folderState === LogFolderState.NotSupported
      ? SharingPopoverTab.Start
      : SharingPopoverTab.Browser;
  };

  const serverState = (
    <ServerState
      isPending={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
    />
  );

  return (
    <TabsProvider initialActiveTab={getInitialActiveTab()}>
      <OlderEntriesRequestTabOpener />

      <h2 className="mb-3 font-mono text-lg font-bold uppercase">
        {SHARING_POPOVER_TITLE}
      </h2>

      {/* On a phone, all tabs must fit into one row */}
      <div
        ref={tabListRef}
        className="max-sm:[&_[role=tab]]:px-1.5 max-sm:[&_[role=tab]]:text-xs"
      >
        <TabList>
          <div className="flex">
            <Tab id={SharingPopoverTab.Start}>
              {SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Start]}
            </Tab>
            <Tab id={SharingPopoverTab.Status}>
              {SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Status]}
            </Tab>
            <Tab id={SharingPopoverTab.Grants}>
              {SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Grants]}
              {data && data.grants.length > 0 && (
                <span className="max-sm:hidden">({data.grants.length})</span>
              )}
            </Tab>
          </div>

          {/* One tab for each runtime whose settings are in SAM */}
          <div className="ml-2 flex border-l border-white/20 pl-2 sm:ml-4 sm:pl-4">
            <Tab id={SharingPopoverTab.Browser}>
              {SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Browser]}
            </Tab>
          </div>
        </TabList>
      </div>

      <TabPanel id={SharingPopoverTab.Start}>
        <StartPanel tabListRef={tabListRef} />
      </TabPanel>

      <TabPanel id={SharingPopoverTab.Status}>
        {serverState}

        {data && <StatusSection runtimes={data.runtimes} />}
      </TabPanel>

      <TabPanel id={SharingPopoverTab.Grants}>
        {serverState}

        {data && (
          <SharedWithOthersSection
            grants={data.grants}
            maximumActiveGrantCount={data.maximumActiveGrantCount}
            canChooseCitizen={data.canChooseCitizen}
            canChooseRole={data.canChooseRole}
          />
        )}
      </TabPanel>

      <TabPanel id={SharingPopoverTab.Browser}>
        <BrowserSettingsSection />
      </TabPanel>
    </TabsProvider>
  );
};

interface StartPanelProps {
  readonly tabListRef: RefObject<HTMLDivElement | null>;
}

const StartPanel = ({ tabListRef }: StartPanelProps) => {
  const { setActiveTab } = useTabsContext();

  /** The link disappears with its panel, thus the focus goes to the new tab */
  const openTab = (tab: SharingPopoverTab) => {
    flushSync(() => setActiveTab(tab));
    tabListRef.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.focus();
  };

  return <StartSection onOpenTab={openTab} />;
};

/** A control UI can make a request while the popover is open */
const OlderEntriesRequestTabOpener = () => {
  const { request } = useOlderEntriesRequest();
  const { setActiveTab } = useTabsContext();
  const requestKey = request?.key ?? null;

  useEffect(() => {
    if (requestKey !== null) setActiveTab(SharingPopoverTab.Browser);
  }, [requestKey, setActiveTab]);

  return null;
};

interface ServerStateProps {
  readonly isPending: boolean;
  readonly error: ReadError | null;
  readonly onRetry: () => void;
}

const ServerState = ({ isPending, error, onRetry }: ServerStateProps) => {
  if (isPending)
    return (
      <p className="flex items-center gap-2 text-sm text-neutral-500">
        <AsciiSpinner />
        Lade den Status …
      </p>
    );

  if (!error) return null;

  return (
    <div role="alert" className="mb-4 flex flex-col gap-2">
      <Note type="error" message={getReadErrorText(error)} />

      <button
        type="button"
        onClick={onRetry}
        className="cursor-pointer self-start font-mono text-sm text-interaction-500 uppercase hover:underline focus-visible:underline active:text-interaction-300"
      >
        Erneut versuchen
      </button>
    </div>
  );
};
