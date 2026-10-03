"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import YesNoCheckbox from "@/modules/common/components/form/YesNoCheckbox";
import {
  NotificationChannel,
  type NotificationSetting,
} from "@sam-monorepo/database/browser";
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
    <NotificationSettingsForm
      className={clsx("flex flex-col gap-0.5", className)}
    >
      <p className="max-w-prose px-4 text-sm text-neutral-500">
        Browser-Benachrichtigungen werden nur an Geräte zugestellt, auf denen du
        sie genehmigt hast.
      </p>

      <div className="flex gap-2 px-4 text-neutral-500">
        <div className="flex-1" />

        <div className="flex w-16 flex-none flex-col items-center justify-center text-center">
          <span className="flex w-full flex-1 items-center justify-center gap-1">
            <FaInfoCircle />
          </span>

          <p className="w-full font-mono text-xs uppercase">On-site</p>
        </div>

        <div className="flex w-16 flex-none flex-col items-center justify-center text-center">
          <span className="flex w-full flex-1 items-center justify-center gap-1">
            <FaMobile /> / <FaDesktop />
          </span>

          <p className="w-full font-mono text-xs uppercase">Browser</p>
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
    <article className="rounded-primary bg-secondary p-4">
      <h2 className="border-b border-white/5 pb-2 font-mono text-xl font-bold uppercase">
        {title}
      </h2>

      <div className="mt-4 flex flex-col gap-2">
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
  // Opt-out model: the existence of a row means the notification type is
  // disabled.
  const isWebDisabled = settings?.some(
    (setting) =>
      setting.notificationType === notificationType.id &&
      setting.channel === NotificationChannel.WEB_PUSH,
  );

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <h3>{notificationType.title}</h3>

        <p className="max-w-prose text-sm text-neutral-500">
          {notificationType.description || <>&nbsp;</>}
        </p>
      </div>

      <div className="flex w-16 flex-none items-center justify-center">
        <YesNoCheckbox
          key={`ONSITE_${notificationType.id}`}
          name={`ONSITE_${notificationType.id}`}
          aria-label={`On-site: ${notificationType.title}`}
          defaultChecked
          hideLabel
          disabled
        />
      </div>

      <div className="flex w-16 flex-none items-center justify-center">
        <YesNoCheckbox
          key={`${NotificationChannel.WEB_PUSH}_${notificationType.id}`}
          name={`${NotificationChannel.WEB_PUSH}_${notificationType.id}`}
          aria-label={`Browser: ${notificationType.title}`}
          defaultChecked={!isWebDisabled}
          hideLabel
        />
      </div>
    </div>
  );
};
