"use client";

import { Link } from "@/modules/common/components/Link";
import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import {
  TabsProvider,
  useTabsContext,
} from "@/modules/common/components/tabs/TabsContext";
import { OnSiteNotificationTab } from "@sam-monorepo/domain";
import { FaArchive, FaCheckDouble, FaCog } from "react-icons/fa";
import { useOnSiteNotificationMutations } from "../hooks/useOnSiteNotificationMutations";
import { NotificationList } from "./NotificationList";
import { useOnSiteNotifications } from "./OnSiteNotificationsProvider";

interface Props {
  /**
   * Called when the user navigates away through a link of the notification
   * center (settings, notification target) so the surrounding popover can
   * close itself.
   */
  readonly onNavigate?: () => void;
}

export const NotificationCenter = ({ onNavigate }: Props) => {
  return (
    <TabsProvider initialActiveTab={OnSiteNotificationTab.Inbox}>
      <div className="flex items-start justify-between gap-2">
        <TabList>
          <Tab id={OnSiteNotificationTab.Inbox}>Posteingang</Tab>
          <Tab id={OnSiteNotificationTab.Archive}>Archiv</Tab>
        </TabList>

        <HeaderActions onNavigate={onNavigate} />
      </div>

      <TabPanel id={OnSiteNotificationTab.Inbox}>
        <NotificationList
          tab={OnSiteNotificationTab.Inbox}
          onNavigate={onNavigate}
        />
      </TabPanel>

      <TabPanel id={OnSiteNotificationTab.Archive}>
        <NotificationList
          tab={OnSiteNotificationTab.Archive}
          onNavigate={onNavigate}
        />
      </TabPanel>
    </TabsProvider>
  );
};

interface HeaderActionsProps {
  readonly onNavigate?: () => void;
}

const HeaderActions = ({ onNavigate }: HeaderActionsProps) => {
  const { activeTab } = useTabsContext();
  const { unreadCount } = useOnSiteNotifications();
  const { markAllRead, archiveAllRead } = useOnSiteNotificationMutations();

  return (
    <div className="flex items-center gap-1">
      {activeTab === OnSiteNotificationTab.Inbox && (
        <>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount <= 0}
            title="Alle als gelesen markieren"
            aria-label="Alle als gelesen markieren"
            className="p-2 text-neutral-500 transition-colors enabled:cursor-pointer enabled:hover:text-interaction-500 enabled:focus-visible:text-interaction-500 enabled:active:scale-95 disabled:opacity-50"
          >
            <FaCheckDouble />
          </button>

          <button
            type="button"
            onClick={() => void archiveAllRead()}
            title="Gelesene archivieren"
            aria-label="Gelesene archivieren"
            className="cursor-pointer p-2 text-neutral-500 transition-colors hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95"
          >
            <FaArchive />
          </button>
        </>
      )}

      <Link
        href="/app/account/notifications"
        onClick={onNavigate}
        title="Einstellungen"
        aria-label="Einstellungen"
        className="p-2 text-neutral-500 transition-colors hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95"
      >
        <FaCog />
      </Link>
    </div>
  );
};
