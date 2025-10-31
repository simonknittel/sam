import { requireAuthenticationPage } from "@/modules/auth/server";
import { NotificationSettings } from "@/modules/notifications/components/NotificationSettings";
import { WebPushSubscriberClient } from "@/modules/notifications/components/WebPushSubscriberClient";
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
    <div className="flex flex-col gap-4">
      <WebPushSubscriberClient />

      <NotificationSettings settings={myNotificationSettings} />

      <section className="flex justify-center">
        <p className="max-w-prose text-center text-xs text-neutral-500">
          Hättest du gerne für weitere Aktionen Benachrichtigungen? Melde dich
          bei uns und wir binden zusätzliche Benachrichtigungen ein.
        </p>
      </section>
    </div>
  );
}
