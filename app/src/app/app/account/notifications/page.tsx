import { requireAuthenticationPage } from "@/modules/auth/server";
import { Note } from "@/modules/common/components/Note";
import { NotificationSettings } from "@/modules/notifications/components/NotificationSettings";
import { type Metadata } from "next";

export const metadata: Metadata = {
  title: "Benachrichtigungen",
};

export default async function Page() {
  await requireAuthenticationPage("/app/account/notifications");

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
