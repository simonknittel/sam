import { env } from "@/env";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { Note } from "@/modules/common/components/Note";
import { getUnleashFlag } from "@/modules/common/utils/getUnleashFlag";
import { UNLEASH_FLAG } from "@/modules/common/utils/UNLEASH_FLAG";
import { NotificationSettings } from "@/modules/notifications/components/NotificationSettings";
import { Inbox, Preferences } from "@novu/nextjs";
import { dark } from "@novu/react/themes";
import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { createHmac } from "node:crypto";

export const metadata: Metadata = {
  title: "Benachrichtigungen",
};

export default async function Page() {
  const authentication = await requireAuthenticationPage(
    "/app/account/notifications",
  );
  if (!authentication.session.entity) notFound();

  if (!(await getUnleashFlag(UNLEASH_FLAG.EnableNotificationsRework))) {
    return (
      <div className="flex flex-col gap-2">
        <NotificationSettings />

        <Note
          type="info"
          message={
            <div className="flex flex-col gap-2">
              <p>
                Browser-Benachrichtigungen werden nur von Google Chrome (Desktop
                und Android), Microsoft Edge (Desktop und Android) sowie Firefox
                (nur, wenn geöffnet) unterstützt. Safari wird nicht unterstützt.
              </p>

              <p>
                Browser-Benachrichtigungen werden pro Browser und Gerät
                gespeichert.
              </p>
            </div>
          }
        />
      </div>
    );
  }

  const hmacHash = createHmac("sha256", env.NOVU_SECRET_KEY!)
    .update(authentication.session.entity.id)
    .digest("hex");

  return (
    <div className="flex flex-col gap-2">
      <div className="background-secondary rounded-primary overflow-hidden">
        <Inbox
          applicationIdentifier={env.NOVU_APPLICATION_IDENTIFIER!}
          subscriberId={authentication.session.entity.id}
          subscriberHash={hmacHash}
          backendUrl={env.NOVU_SERVER_URL}
          socketUrl={env.NOVU_SOCKET_URL}
          appearance={{
            baseTheme: dark,
            variables: {
              colorPrimary: "#c22424",
            },
            elements: {
              popoverTrigger: "h-12 rounded-none",
              bellDot: "bg-green-500",
              preferencesContainer: "pr-3",
            },
          }}
          localization={{
            locale: "de-DE",
          }}
          preferenceGroups={[
            {
              name: "Changelog",
              filter: { tags: ["Changelog"] },
            },
            {
              name: "Events",
              filter: { tags: ["Events"] },
            },
            {
              name: "SINcome",
              filter: { tags: ["SINcome"] },
            },
          ]}
          tabs={[
            {
              label: "Alle",
              filter: { tags: [] },
            },
            {
              label: "Changelog",
              filter: { tags: ["Changelog"] },
            },
            {
              label: "Events",
              filter: { tags: ["Events"] },
            },
            {
              label: "SINcome",
              filter: { tags: ["SINcome"] },
            },
          ]}
        >
          <Preferences />
        </Inbox>
      </div>
    </div>
  );
}
