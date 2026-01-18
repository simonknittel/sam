"use client";

import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { Button2 } from "@/modules/common/components/Button2";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import Note from "@/modules/common/components/Note";
import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import toast from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";
import { createSilcTransaction } from "../actions/createSilcTransaction";

interface Props {
  readonly onSuccess?: () => void;
}

export const CreateSilcTransactionForm = ({ onSuccess }: Props) => {
  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response = await createSilcTransaction(formData);

        if (response.error) {
          toast.error(response.error);
          console.error(response);
          return response;
        }

        toast.success(response.success!);
        onSuccess?.();
        return response;
      } catch (error) {
        unstable_rethrow(error);
        toast.error(
          "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
        );
        console.error(error);
        return {
          error:
            "Ein unbekannter Fehler ist aufgetreten. Bitte versuche es später erneut.",
          requestPayload: formData,
        };
      }
    },
    null,
  );

  return (
    <form action={formAction}>
      <CitizenInput name="receiverId" multiple autoFocus />

      <NumberInput
        name="value"
        label="Wert"
        hint="Kann negativ sein, um Guthaben zu entziehen."
        required
        defaultValue={
          state?.requestPayload?.has("value")
            ? (state.requestPayload.get("value") as string)
            : 1
        }
        labelClassName="mt-4"
      />

      <Textarea
        name="description"
        label="Beschreibung"
        hint="optional"
        maxLength={512}
        defaultValue={
          state?.requestPayload?.has("description")
            ? (state.requestPayload.get("description") as string)
            : ""
        }
        className="mt-4"
      />

      <Button2 type="submit" disabled={isPending} className="mt-4">
        {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
        Speichern
      </Button2>

      {state?.error && (
        <Note type="error" message={state.error} className="mt-4" />
      )}
    </form>
  );
};
