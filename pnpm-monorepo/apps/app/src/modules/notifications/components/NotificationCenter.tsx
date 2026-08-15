"use client";

import { Link } from "@/modules/common/components/Link";
import Tab from "@/modules/common/components/tabs/Tab";
import TabList from "@/modules/common/components/tabs/TabList";
import TabPanel from "@/modules/common/components/tabs/TabPanel";
import {
  TabsProvider,
  useTabsContext,
} from "@/modules/common/components/tabs/TabsContext";
import { useCallback, useState } from "react";
import { FaArchive, FaCheckDouble, FaCog } from "react-icons/fa";
import { useOnSiteNotificationMutations } from "../hooks/useOnSiteNotificationMutations";
import { NotificationCenterTab } from "../utils/types";
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
  /**
   * Notifications marked read by read-on-view keep their unread highlight so
   * users don't lose track of what is new while they are still reading. The
   * set resets when the notification center unmounts, i.e. when the
   * surrounding popover closes. Marking all as read clears it immediately.
   */
  const [retainedHighlightIds, setRetainedHighlightIds] = useState<
    ReadonlySet<string>
  >(new Set());

  const retainHighlights = useCallback((notificationIds: string[]) => {
    setRetainedHighlightIds(
      (previousIds) => new Set([...previousIds, ...notificationIds]),
    );
  }, []);

  const clearRetainedHighlights = useCallback(() => {
    setRetainedHighlightIds(new Set());
  }, []);

  return (
    <TabsProvider initialActiveTab={NotificationCenterTab.Inbox}>
      <div className="flex items-start justify-between gap-2">
        <TabList>
          <Tab id={NotificationCenterTab.Inbox}>Posteingang</Tab>
          <Tab id={NotificationCenterTab.Archive}>Archiv</Tab>
        </TabList>

        <HeaderActions
          onNavigate={onNavigate}
          onClearRetainedHighlights={clearRetainedHighlights}
        />
      </div>

      <TabPanel id={NotificationCenterTab.Inbox}>
        <NotificationList
          tab={NotificationCenterTab.Inbox}
          onNavigate={onNavigate}
          retainedHighlightIds={retainedHighlightIds}
          onRetainHighlights={retainHighlights}
        />
      </TabPanel>

      <TabPanel id={NotificationCenterTab.Archive}>
        <NotificationList
          tab={NotificationCenterTab.Archive}
          onNavigate={onNavigate}
        />
      </TabPanel>
    </TabsProvider>
  );
};

interface HeaderActionsProps {
  readonly onNavigate?: () => void;
  readonly onClearRetainedHighlights: () => void;
}

const HeaderActions = ({
  onNavigate,
  onClearRetainedHighlights,
}: HeaderActionsProps) => {
  const { activeTab } = useTabsContext();
  const { unreadCount } = useOnSiteNotifications();
  const { markAllRead, archiveAllRead } = useOnSiteNotificationMutations();

  return (
    <div className="flex items-center gap-1">
      {activeTab === NotificationCenterTab.Inbox && (
        <>
          <button
            type="button"
            onClick={() => {
              onClearRetainedHighlights();
              void markAllRead();
            }}
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
