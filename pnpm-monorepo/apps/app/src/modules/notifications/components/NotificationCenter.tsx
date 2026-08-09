"use client";

import { Link } from "@/modules/common/components/Link";
import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import {
  TabsProvider,
  useTabsContext,
} from "@/modules/common/components/tabs/TabsContext";
import { FaArchive, FaCheckDouble, FaCog } from "react-icons/fa";
import { useOnSiteNotificationMutations } from "../hooks/useOnSiteNotificationMutations";
import { NotificationCenterTab } from "../utils/types";
import { NotificationList } from "./NotificationList";
import { useOnSiteNotifications } from "./OnSiteNotificationsProvider";

interface Props {
  /**
   * Called when the user navigates away through a link of the notification
   * center (settings, notification target) so the surrounding popover or
   * flyout can close itself.
   */
  readonly onNavigate?: () => void;
  /**
   * Set to false while the surrounding container keeps the center mounted
   * but off-screen (mobile flyout) — pauses queries and read-on-view.
   */
  readonly enabled?: boolean;
}

export const NotificationCenter = ({ onNavigate, enabled = true }: Props) => {
  return (
    <TabsProvider initialActiveTab={NotificationCenterTab.Inbox}>
      <div className="flex items-start justify-between gap-2">
        <TabList>
          <Tab id={NotificationCenterTab.Inbox}>Posteingang</Tab>
          <Tab id={NotificationCenterTab.Archive}>Archiv</Tab>
        </TabList>

        <HeaderActions onNavigate={onNavigate} />
      </div>

      <TabPanel id={NotificationCenterTab.Inbox}>
        <NotificationList
          tab={NotificationCenterTab.Inbox}
          onNavigate={onNavigate}
          enabled={enabled}
        />
      </TabPanel>

      <TabPanel id={NotificationCenterTab.Archive}>
        <NotificationList
          tab={NotificationCenterTab.Archive}
          onNavigate={onNavigate}
          enabled={enabled}
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
      {activeTab === NotificationCenterTab.Inbox && (
        <>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount <= 0}
            title="Alle als gelesen markieren"
            aria-label="Alle als gelesen markieren"
            className="p-2 text-neutral-500 enabled:hover:text-interaction-500 enabled:focus-visible:text-interaction-500 enabled:active:scale-95 disabled:opacity-50 enabled:cursor-pointer transition-colors"
          >
            <FaCheckDouble />
          </button>

          <button
            type="button"
            onClick={() => void archiveAllRead()}
            title="Gelesene archivieren"
            aria-label="Gelesene archivieren"
            className="p-2 text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95 cursor-pointer transition-colors"
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
        className="p-2 text-neutral-500 hover:text-interaction-500 focus-visible:text-interaction-500 active:scale-95 transition-colors"
      >
        <FaCog />
      </Link>
    </div>
  );
};
