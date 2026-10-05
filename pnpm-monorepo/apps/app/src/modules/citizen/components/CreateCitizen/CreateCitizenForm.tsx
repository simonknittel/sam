"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import clsx from "clsx";
import { FaSave } from "react-icons/fa";
import { createCitizen } from "../../actions/createCitizen";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreateCitizenForm = ({ className, onSuccess }: Props) => {
  const { state, formAction, getDefaultValueWithFallback } = useAction(
    createCitizen,
    {
      errorToast: false,
      onSuccess,
    },
  );

  return (
    <form action={formAction} className={clsx(className)}>
      <TextInput
        name="spectrumId"
        label="Spectrum ID"
        defaultValue={getDefaultValueWithFallback("spectrumId", "")}
        required
        autoFocus
      />

      <ActionErrorNote className="mt-4" state={state} />

      <div className="mt-8 flex justify-end">
        <SubmitButton icon={<FaSave />}>Anlegen</SubmitButton>
      </div>
    </form>
  );
};
