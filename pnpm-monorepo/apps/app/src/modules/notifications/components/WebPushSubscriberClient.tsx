"use client";

import { env } from "@/env";
import { runAction } from "@/modules/actions/utils/runAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import { useState } from "react";
import toast from "react-hot-toast";
import { subscribeWebPush } from "../actions/subscribeWebPush";
import { unsubscribeWebPush } from "../actions/unsubscribeWebPush";

interface Props {
  readonly className?: string;
  readonly hasSubscriptions: boolean;
}

export const WebPushSubscriberClient = ({
  className,
  hasSubscriptions,
}: Props) => {
  const [isPending, setIsPending] = useState(false);
  const [isUnsubscribePending, setIsUnsubscribePending] = useState(false);

  const handleClick = () => {
    if (!env.NEXT_PUBLIC_VAPID_KEY) {
      console.info("Missing environment variables for Web Push");
      toast.error(
        "Die Benachrichtigungen können derzeit nicht aktiviert werden. Bitte probiere es später erneut.",
      );
      return;
    }

    setIsPending(true);

    if (!("Notification" in window) || !("PushManager" in window)) {
      toast.error("Dieser Browser unterstützt keine Benachrichtigungen.");
      setIsPending(false);
      return;
    }

    /**
     * Request permission for notifications
     */
    void Notification.requestPermission().then(async (permission) => {
      if (permission !== "granted") {
        toast.error("Die Benachrichtigungen wurden nicht genehmigt.");
        setIsPending(false);
        return;
      }

      /**
       * Subscribe to push notifications
       */
      let registration;
      let subscription;
      try {
        registration =
          await navigator.serviceWorker.register("/service-worker.js");

        subscription = await registration.pushManager.getSubscription();
        await subscription?.unsubscribe();

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: env.NEXT_PUBLIC_VAPID_KEY,
        });
      } catch (error) {
        setIsPending(false);
        toast.error(
          "Es gab einen Fehler beim Aktivieren der Benachrichtigungen. Bitte probiere es später erneut.",
        );
        console.error(error);
        return;
      }

      /**
       * Send subscription to server
       */
      const formData = new FormData();
      formData.append("subscription", JSON.stringify(subscription));
      const succeeded = await runAction(subscribeWebPush, formData, {
        successToast: false,
      });

      setIsPending(false);
      if (succeeded)
        toast.success("Die Benachrichtigungen wurden erfolgreich aktiviert.");
    });
  };

  const handleUnsubscribeClick = async () => {
    setIsUnsubscribePending(true);

    /**
     * Best-effort clean-up of the subscription on this device. The server
     * won't send push notifications without the stored subscriptions anyway,
     * so failures are ignored.
     */
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        await subscription?.unsubscribe();
      }
    } catch (error) {
      console.error(error);
    }

    await runAction(unsubscribeWebPush, new FormData());

    setIsUnsubscribePending(false);
  };

  return (
    <Tile heading="Browser-Benachrichtigungen" className={clsx(className)}>
      <div className="max-w-prose">
        <p>
          Um Benachrichtigungen über diesen Browser zu erhalten, musst du dies
          erst genehmigen.
        </p>

        <Button2
          type="button"
          onClick={handleClick}
          disabled={isPending}
          variant={Button2Variant.Secondary}
          className="mt-2"
        >
          {isPending && <AsciiSpinner />}
          Genehmigung anfordern
        </Button2>

        <p className="text-neutral-500 text-sm mt-2">
          Auf iOS-Geräten musst du das SAM zuerst zu deinem Home-Bildschirm
          hinzufügen, bevor du die Genehmigung anfordern kannst.
        </p>

        <p className="text-neutral-500 text-sm mt-2">
          Die Genehmigung muss pro Browser und Gerät angefordert werden.
        </p>

        {hasSubscriptions && (
          <div className="border-t border-white/5 mt-4 pt-4">
            <p>
              Browser-Benachrichtigungen sind auf mindestens einem Gerät
              aktiviert.
            </p>

            <Button2
              type="button"
              onClick={() => void handleUnsubscribeClick()}
              disabled={isUnsubscribePending}
              variant={Button2Variant.Secondary}
              className="mt-2"
            >
              {isUnsubscribePending && <AsciiSpinner />}
              Auf allen Geräten deaktivieren
            </Button2>

            <p className="text-neutral-500 text-sm mt-2">
              Dabei werden alle Geräte abgemeldet. Zum erneuten Aktivieren muss
              die Genehmigung pro Gerät erneut angefordert werden. Die
              Genehmigung im Browser bleibt bestehen und kann nur über dessen
              Einstellungen entzogen werden.
            </p>
          </div>
        )}
      </div>
    </Tile>
  );
};
