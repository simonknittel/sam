"use client";

import { env } from "@/env";
import { Button2 } from "@/modules/common/components/Button2";
import { Tile } from "@/modules/common/components/Tile";
import clsx from "clsx";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";
import { subscribeWebPush } from "../actions/subscribeWebPush";

interface Props {
  readonly className?: string;
}

export const WebPushSubscriberClient = ({ className }: Props) => {
  const [isPending, setIsPending] = useState(false);

  const handleClick = () => {
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
      await subscribeWebPush(formData);

      setIsPending(false);
      toast.success("Die Benachrichtigungen wurden erfolgreich aktiviert.");
    });
  };

  return (
    <Tile heading="Browser-Benachrichtigungen" className={clsx(className)}>
      <p>
        Um Benachrichtigungen über diesen Browser zu erhalten, musst du dies
        erst genehmigen.
      </p>

      <Button2
        type="button"
        onClick={handleClick}
        disabled={isPending}
        variant="secondary"
        className="mt-2"
      >
        {isPending && <FaSpinner className="animate-spin" />}
        Genehmigung anfordern
      </Button2>

      <p className="text-neutral-500 text-sm mt-2">
        Auf iOS-Geräten musst du das S.A.M. zu deinem Home-Bildschirm
        hinzufügen, bevor du die Genehmigung anfordern kannst.
      </p>

      <p className="text-neutral-500 text-sm mt-2">
        Die Genehmigung muss pro Browser und Gerät angefordert werden.
      </p>
    </Tile>
  );
};
