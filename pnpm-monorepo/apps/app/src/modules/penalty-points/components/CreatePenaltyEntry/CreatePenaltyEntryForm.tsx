import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { Button2 } from "@/modules/common/components/Button2";
import { DateTimeInput } from "@/modules/common/components/form/DateTimeInput";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import Note from "@/modules/common/components/Note";
import { createPenaltyEntry } from "@/modules/penalty-points/actions/createPenaltyEntry";
import clsx from "clsx";
import { unstable_rethrow } from "next/navigation";
import { useActionState } from "react";
import toast from "react-hot-toast";
import { FaSave, FaSpinner } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreatePenaltyEntryForm = ({ className, onSuccess }: Props) => {
  const [state, formAction, isPending] = useActionState(
    async (previousState: unknown, formData: FormData) => {
      try {
        const response = await createPenaltyEntry(formData);

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
    <form action={formAction} className={clsx(className)}>
      <CitizenInput name="citizenId" autoFocus />

      <NumberInput
        name="points"
        label="Strafpunkte"
        min={1}
        defaultValue={
          state?.requestPayload?.has("points")
            ? (state.requestPayload.get("points") as string)
            : 1
        }
        required
        labelClassName="mt-4"
      />

      <Textarea
        name="reason"
        label="Begründung"
        hint="optional"
        maxLength={512}
        defaultValue={
          state?.requestPayload?.has("reason")
            ? (state.requestPayload.get("reason") as string)
            : ""
        }
      />

      <DateTimeInput
        name="expiresAt"
        label="Verfällt am"
        hint="optional"
        defaultValue={
          state?.requestPayload?.has("expiresAt")
            ? (state.requestPayload.get("expiresAt") as string)
            : ""
        }
      />

      <Button2 type="submit" disabled={isPending} className="ml-auto mt-4">
        {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
        Speichern
      </Button2>

      {state?.error && (
        <Note type="error" message={state.error} className="mt-4" />
      )}
    </form>
  );
};
