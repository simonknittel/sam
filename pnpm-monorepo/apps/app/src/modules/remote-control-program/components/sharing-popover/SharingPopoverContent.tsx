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
import { useEffect } from "react";
import { SESSION_EXPIRED_TEXT } from "../../utils/remoteControlProgramTexts";
import { BrowserSettingsSection } from "./BrowserSettingsSection";
import { SharedWithOthersSection } from "./SharedWithOthersSection";
import { useOlderEntriesRequest } from "./SharingPopoverProvider";
import { StatusSection } from "./StatusSection";
import { useSharingPopoverQuery } from "./useSharingPopoverQuery";

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

enum SharingPopoverTab {
  ThisBrowser = "this_browser",
  Status = "status",
  Grants = "grants",
}

/**
 * The content of the sharing popover in the top bar and in the bottom sheet
 * of the mobile action bar. The tab of this browser does not wait for the
 * data of the server.
 */
export const SharingPopoverContent = () => {
  const query = useSharingPopoverQuery({ isPopoverOpen: true });
  const { data } = query;
  const { request } = useOlderEntriesRequest();

  const serverState = (
    <ServerState
      isPending={query.isPending}
      error={query.error}
      onRetry={() => void query.refetch()}
    />
  );

  return (
    <TabsProvider
      initialActiveTab={
        data?.stoppedAt && !request
          ? SharingPopoverTab.Status
          : SharingPopoverTab.ThisBrowser
      }
    >
      <OlderEntriesRequestTabOpener />

      <TabList>
        <Tab id={SharingPopoverTab.ThisBrowser}>Browser</Tab>
        <Tab id={SharingPopoverTab.Status}>Status</Tab>
        <Tab id={SharingPopoverTab.Grants}>
          Freigaben
          {data && data.grants.length > 0 && (
            <span className="max-sm:hidden">({data.grants.length})</span>
          )}
        </Tab>
      </TabList>

      <TabPanel id={SharingPopoverTab.ThisBrowser}>
        <BrowserSettingsSection />
      </TabPanel>

      <TabPanel id={SharingPopoverTab.Status}>
        {serverState}

        {data && (
          <StatusSection runtimes={data.runtimes} stoppedAt={data.stoppedAt} />
        )}
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
    </TabsProvider>
  );
};

/** A control UI can make a request while the popover is open */
const OlderEntriesRequestTabOpener = () => {
  const { request } = useOlderEntriesRequest();
  const { setActiveTab } = useTabsContext();
  const requestKey = request?.key ?? null;

  useEffect(() => {
    if (requestKey !== null) setActiveTab(SharingPopoverTab.ThisBrowser);
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
