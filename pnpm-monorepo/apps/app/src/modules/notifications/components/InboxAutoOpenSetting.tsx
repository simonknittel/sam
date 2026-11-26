"use client";

import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { Tile } from "@/modules/common/components/Tile";
import { useId } from "react";
import { updateMyInboxAutoOpenSetting } from "../actions/updateMyInboxAutoOpenSetting";
import { INBOX_AUTO_OPEN_INPUT_NAME } from "../utils/inboxAutoOpenInputName";
import { NotificationSettingsForm } from "./NotificationSettingsForm";

interface Props {
  readonly className?: string;
  readonly isEnabled: boolean;
}

export const InboxAutoOpenSetting = ({ className, isEnabled }: Props) => {
  const inputId = useId();

  return (
    <Tile heading="Inbox" className={className}>
      <NotificationSettingsForm
        action={updateMyInboxAutoOpenSetting}
        className="flex items-center gap-4"
      >
        <div className="flex-1">
          <label htmlFor={inputId} className="cursor-pointer">
            Automatisch öffnen
          </label>

          <p className="max-w-prose text-sm text-neutral-500">
            Auf dem Desktop öffnet sich die Inbox von selbst, wenn beim Laden
            der Seite ungelesene Benachrichtigungen da sind oder eine neue
            eintrifft.
          </p>
        </div>

        <YesNoCheckbox
          id={inputId}
          name={INBOX_AUTO_OPEN_INPUT_NAME}
          defaultChecked={isEnabled}
          hideLabel
          className="flex-none"
        />
      </NotificationSettingsForm>
    </Tile>
  );
};
