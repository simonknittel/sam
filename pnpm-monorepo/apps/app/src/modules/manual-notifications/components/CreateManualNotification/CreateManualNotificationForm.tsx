"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { ItemPickerMode } from "@/modules/common/components/ItemPicker/ItemPickerMode";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { createManualNotification } from "@/modules/manual-notifications/actions/createManualNotification";
import { RolePicker } from "@/modules/roles/components/RolePicker/RolePicker";
import {
  MANUAL_NOTIFICATION_BODY_MAX_LENGTH,
  MANUAL_NOTIFICATION_TITLE_MAX_LENGTH,
} from "@sam-monorepo/domain";
import clsx from "clsx";
import { FaPaperPlane } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreateManualNotificationForm = ({
  className,
  onSuccess,
}: Props) => {
  const { state, formAction, getDefaultValueWithFallback } = useAction(
    createManualNotification,
    {
      errorToast: false,
      onSuccess,
    },
  );

  return (
    <form action={formAction} className={clsx(className)}>
      <TextInput
        name="title"
        label="Titel"
        maxLength={MANUAL_NOTIFICATION_TITLE_MAX_LENGTH}
        defaultValue={getDefaultValueWithFallback("title", "")}
        required
        autoFocus
      />

      <Textarea
        name="body"
        label="Text"
        hint={`max. ${MANUAL_NOTIFICATION_BODY_MAX_LENGTH} Zeichen`}
        maxLength={MANUAL_NOTIFICATION_BODY_MAX_LENGTH}
        defaultValue={getDefaultValueWithFallback("body", "")}
        required
        className="mt-4"
      />

      <CitizenInput name="citizenId" multiple className="mt-4" />

      <RolePicker
        mode={ItemPickerMode.Multiple}
        name="roleId[]"
        label="Rollen"
        className="mt-4"
      />

      <SubmitButton icon={<FaPaperPlane />} className="mt-4 ml-auto">
        Senden
      </SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
