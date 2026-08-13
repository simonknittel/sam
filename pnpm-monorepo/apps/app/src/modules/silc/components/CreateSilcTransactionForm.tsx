"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Button2 } from "@/modules/common/components/Button2";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { FaSave } from "react-icons/fa";
import { createSilcTransaction } from "../actions/createSilcTransaction";

interface Props {
  readonly onSuccess?: () => void;
}

export const CreateSilcTransactionForm = ({ onSuccess }: Props) => {
  const { state, formAction, isPending, getDefaultValueWithFallback } =
    useAction(createSilcTransaction, {
      errorToast: false,
      onSuccess: (formData) => {
        if (formData.has("createAnother")) return;
        onSuccess?.();
      },
    });

  return (
    <form action={formAction}>
      <CitizenInput name="receiverId" multiple autoFocus />

      <NumberInput
        name="value"
        label="Wert"
        hint="Kann negativ sein, um Guthaben zu entziehen."
        required
        defaultValue={getDefaultValueWithFallback("value", 1)}
        labelClassName="mt-4"
      />

      <Textarea
        name="description"
        label="Beschreibung"
        hint="optional"
        maxLength={512}
        defaultValue={getDefaultValueWithFallback("description", "")}
        className="mt-4"
      />

      <div className="flex flex-col gap-2 mt-4">
        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>

        <Button
          type="submit"
          disabled={isPending}
          variant="tertiary"
          name="createAnother"
        >
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern und weitere Transaktion erstellen
        </Button>
      </div>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
