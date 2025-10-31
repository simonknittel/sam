import { requireAuthenticationPage } from "@/modules/auth/server";
import { NotificationSettings } from "@/modules/notifications/components/NotificationSettings";
import { WebPushSubscriberLoader } from "@/modules/notifications/components/WebPushSubscriberLoader";
import { getMyNotificationSettings } from "@/modules/notifications/utils/queries";
import { type Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Benachrichtigungen",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/account/notifications",
  );
  if (!authentication.session.entity) notFound();

  const myNotificationSettings = await getMyNotificationSettings();
  return (
    <div className="flex flex-col gap-2">
      <WebPushSubscriberLoader />
      <NotificationSettings settings={myNotificationSettings} />
    </div>
  );
}
