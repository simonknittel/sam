"use client";

import Button from "@/modules/common/components/Button";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { FaTrash } from "react-icons/fa";
import { deleteWebPushSubscription } from "../actions/deleteWebPushSubscription";
import { useWebPushBrowser } from "./WebPushBrowserProvider";

interface Props {
  readonly className?: string;
  readonly subscriptionId: string;
}

export const DeleteWebPushSubscriptionButton = ({
  className,
  subscriptionId,
}: Props) => {
  const { currentSubscriptionId, removeBrowserSubscription } =
    useWebPushBrowser();
  const isCurrentBrowser = subscriptionId === currentSubscriptionId;

  const action = async (formData: FormData) => {
    const response = await deleteWebPushSubscription(formData);
    if (isCurrentBrowser && !("error" in response))
      await removeBrowserSubscription();

    return response;
  };

  return (
    <ConfirmActionButton
      className={className}
      action={action}
      hiddenFields={[{ name: "id", value: subscriptionId }]}
      trigger={(isPending) => (
        <Button
          type="submit"
          variant="tertiary"
          disabled={isPending}
          aria-label="Browser entfernen"
        >
          <FaTrash /> Entfernen
        </Button>
      )}
      title="Browser entfernen?"
      description="Der Browser erhält danach keine Benachrichtigungen mehr. Du kannst sie in dem Browser jederzeit wieder aktivieren."
      confirmLabel="Entfernen"
    />
  );
};
