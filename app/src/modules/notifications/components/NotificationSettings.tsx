"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import { Tile } from "@/modules/common/components/Tile";
import { NotificationChannel, type NotificationSetting } from "@prisma/client";
import clsx from "clsx";
import { FaDesktop, FaInfoCircle, FaMobile } from "react-icons/fa";
import {
  NOTIFICATIONS_APPS,
  type NotificationType,
} from "../utils/NotificationTypes";
import { NotificationSettingsForm } from "./NotificationSettingsForm";

interface Props {
  readonly className?: string;
  readonly settings?: NotificationSetting[] | null;
}

export const NotificationSettings = ({ className, settings }: Props) => {
  const authentication = useAuthentication();
  if (!authentication || !authentication.session.entity)
    throw new Error("Unauthorized");

  return (
    <Tile heading="Einstellungen" className={clsx(className)}>
      <NotificationSettingsForm className="flex flex-col gap-4">
        <div className="flex gap-2 text-neutral-500">
          <div className="flex-1" />

          <div className="flex-none w-16 flex flex-col justify-center items-center text-center">
            <span className="flex-1 w-full flex justify-center items-center gap-1">
              <FaInfoCircle />
            </span>

            <p className="w-full text-sm">On-site</p>
          </div>

          <div className="flex-none w-16 flex flex-col justify-center items-center text-center">
            <span className="flex-1 w-full flex justify-center items-center gap-1">
              <FaMobile /> / <FaDesktop />
            </span>

            <p className="w-full text-sm">Browser</p>
          </div>
        </div>

        {NOTIFICATIONS_APPS.map((app) => (
          <AppSettings
            key={app.appTitle}
            title={app.appTitle}
            notificationTypes={app.notificationTypes}
            settings={settings}
          />
        ))}
      </NotificationSettingsForm>
    </Tile>
  );
};

interface AppSettingsProp {
  readonly title: string;
  readonly notificationTypes: NotificationType[];
  readonly settings?: NotificationSetting[] | null;
}

const AppSettings = ({
  title,
  notificationTypes,
  settings,
}: AppSettingsProp) => {
  return (
    <article>
      <h2 className="text-xl font-bold border-b border-white/5 pb-2">
        {title}
      </h2>

      <div className="flex flex-col gap-2 mt-4">
        {notificationTypes.map((notification) => (
          <SingleNotificationSettings
            key={notification.id}
            notificationType={notification}
            settings={settings}
          />
        ))}
      </div>
    </article>
  );
};

interface SingleNotificationSettingsProps {
  readonly notificationType: NotificationType;
  readonly settings?: NotificationSetting[] | null;
}

const SingleNotificationSettings = ({
  notificationType,
  settings,
}: SingleNotificationSettingsProps) => {
  const isWebEnabled = settings?.some(
    (setting) =>
      setting.notificationType === notificationType.id &&
      setting.channel === NotificationChannel.WEB_PUSH,
  );

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <h3>{notificationType.title}</h3>

        <p className="text-sm text-neutral-500">
          {notificationType.description || <>&nbsp;</>}
        </p>
      </div>

      <div className="flex-none w-16 flex justify-center items-center">
        <YesNoCheckbox
          key={`ONSITE_${notificationType.id}`}
          name={`ONSITE_${notificationType.id}`}
          defaultChecked
          hideLabel
          disabled
        />
      </div>

      <div className="flex-none w-16 flex justify-center items-center">
        <YesNoCheckbox
          key={`${NotificationChannel.WEB_PUSH}_${notificationType.id}`}
          name={`${NotificationChannel.WEB_PUSH}_${notificationType.id}`}
          defaultChecked={isWebEnabled}
          hideLabel
        />
      </div>
    </div>
  );
};
