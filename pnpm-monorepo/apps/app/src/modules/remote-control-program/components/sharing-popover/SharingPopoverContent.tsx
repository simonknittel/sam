"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Note from "@/modules/common/components/Note";
import Tab from "@/modules/common/components/tabs/Tab";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import {
  TabsProvider,
  useTabsContext,
} from "@/modules/common/components/tabs/TabsContext";
import { useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { LogFolderState } from "../../runtime/types";
import { useBrowserRuntime } from "../../runtime/useBrowserRuntime";
import { SESSION_EXPIRED_TEXT } from "../../utils/remoteControlProgramTexts";
import { RuntimesSection } from "./RuntimesSection";
import { SharedWithOthersSection } from "./SharedWithOthersSection";
import {
  BROWSER_RUNTIME_LOCATION,
  SHARING_POPOVER_TAB_LABELS,
  SharingPopoverRuntimeTab,
  SharingPopoverTab,
  type SharingPopoverLocation,
  type SharingPopoverRuntimeLocation,
} from "./SharingPopoverTab";
import { SharingPopoverTabList } from "./SharingPopoverTabList";
import { StartSection } from "./StartSection";
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
  return "Die Daten konnten nicht geladen werden.";
};

interface Props {
  /** For example the Log Analyzer asks for the log folder. Null: the trigger opened the popover. */
  readonly locationOfControlUi: SharingPopoverLocation | null;
}

/**
 * The content of the sharing popover in the top bar and in the bottom sheet.
 * The sub-tab of this browser does not wait for the data of the server.
 */
export const SharingPopoverContent = ({ locationOfControlUi }: Props) => {
  const query = useSharingPopoverQuery();
  const { data } = query;
  const folderState = useBrowserRuntime()?.state.folder.state;
  const tabListRef = useRef<HTMLDivElement>(null);
  const runtimeTabListRef = useRef<HTMLDivElement>(null);

  // The content mounts at each open of the popover
  const [initialLocation] = useState((): SharingPopoverLocation => {
    if (locationOfControlUi) return locationOfControlUi;
    return folderState === LogFolderState.NotSelected ||
      folderState === LogFolderState.NotSupported
      ? { tab: SharingPopoverTab.Start }
      : BROWSER_RUNTIME_LOCATION;
  });
  const [runtimeTab, setRuntimeTab] = useState(
    initialLocation.tab === SharingPopoverTab.Runtimes
      ? initialLocation.runtimeTab
      : SharingPopoverRuntimeTab.Browser,
  );

  const serverState = (
    <ServerState
      isPending={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
    />
  );

  return (
    <TabsProvider initialActiveTab={initialLocation.tab}>
      <h2 className="mb-3 font-mono text-lg font-bold uppercase">
        {SHARING_POPOVER_TITLE}
      </h2>

      <SharingPopoverTabList ref={tabListRef}>
        {/* On a phone, all tabs must fit into one row */}
        <div className="flex">
          <Tab id={SharingPopoverTab.Start}>
            {SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Start]}
          </Tab>
          <Tab id={SharingPopoverTab.Grants}>
            {SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Grants]}
            {data && data.grants.length > 0 && (
              <span className="max-sm:hidden">({data.grants.length})</span>
            )}
          </Tab>
          <Tab id={SharingPopoverTab.Runtimes}>
            {SHARING_POPOVER_TAB_LABELS[SharingPopoverTab.Runtimes]}
          </Tab>
        </div>
      </SharingPopoverTabList>

      <TabPanel id={SharingPopoverTab.Start}>
        <StartPanel
          tabListRef={tabListRef}
          runtimeTabListRef={runtimeTabListRef}
          onShowRuntimeLocation={(location) =>
            setRuntimeTab(location.runtimeTab)
          }
        />
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

      <TabPanel id={SharingPopoverTab.Runtimes}>
        <RuntimesSection
          runtimeTab={runtimeTab}
          onRuntimeTabChange={setRuntimeTab}
          tabListRef={runtimeTabListRef}
          serverState={serverState}
          desktopCompanions={data?.desktopCompanions}
          desktopCompanionSignIns={data?.desktopCompanionSignIns}
        />
      </TabPanel>
    </TabsProvider>
  );
};

interface StartPanelProps {
  readonly tabListRef: RefObject<HTMLDivElement | null>;
  readonly runtimeTabListRef: RefObject<HTMLDivElement | null>;
  /** Shows the sub-tab of the location */
  readonly onShowRuntimeLocation: (
    location: SharingPopoverRuntimeLocation,
  ) => void;
}

const StartPanel = ({
  tabListRef,
  runtimeTabListRef,
  onShowRuntimeLocation,
}: StartPanelProps) => {
  const { setActiveTab } = useTabsContext();

  /**
   * The link disappears with its panel, thus the focus goes to the new tab,
   * or to the new sub-tab
   */
  const openLocation = (location: SharingPopoverLocation) => {
    flushSync(() => {
      setActiveTab(location.tab);
      if (location.tab === SharingPopoverTab.Runtimes)
        onShowRuntimeLocation(location);
    });
    const activeTabList =
      location.tab === SharingPopoverTab.Runtimes
        ? runtimeTabListRef.current
        : tabListRef.current;
    activeTabList
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.focus();
  };

  return <StartSection onOpenLocation={openLocation} />;
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
        Lade die Daten …
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
