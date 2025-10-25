import { env } from "@/env";
import { requireAuthenticationPage } from "@/modules/auth/server";
import { Note } from "@/modules/common/components/Note";
import { NotificationSettings } from "@/modules/notifications/components/NotificationSettings";
import { isNovuEnabled } from "@/modules/novu/utils";
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

  if (!(await isNovuEnabled())) {
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

  const hmacHash = createHmac("sha256", env.NOVA_SECRET_KEY!)
    .update(authentication.session.entity.id)
    .digest("hex");

  return (
    <div className="flex flex-col gap-2">
      {/* <NotificationSettings />

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
      /> */}

      <div className="background-secondary rounded-primary overflow-hidden">
        <Inbox
          applicationIdentifier={env.NOVA_APPLICATION_IDENTIFIER!}
          subscriberId={authentication.session.entity.id}
          subscriberHash={hmacHash}
          backendUrl={env.NOVA_SERVER_URL}
          socketUrl={env.NOVA_SOCKET_URL}
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
        >
          <Preferences />
        </Inbox>
      </div>
    </div>
  );
}
