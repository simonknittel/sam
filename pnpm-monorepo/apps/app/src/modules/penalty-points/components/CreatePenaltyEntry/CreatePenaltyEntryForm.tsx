import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { CitizenInput } from "@/modules/citizen/components/CitizenInput";
import { DateTimeInput } from "@/modules/common/components/form/DateTimeInput";
import { NumberInput } from "@/modules/common/components/form/NumberInput";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { createPenaltyEntry } from "@/modules/penalty-points/actions/createPenaltyEntry";
import clsx from "clsx";
import { FaSave } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreatePenaltyEntryForm = ({ className, onSuccess }: Props) => {
  const { state, formAction, getDefaultValueWithFallback } = useAction(
    createPenaltyEntry,
    {
      errorToast: false,
      onSuccess,
    },
  );

  return (
    <form action={formAction} className={clsx(className)}>
      <CitizenInput name="citizenId" autoFocus />

      <NumberInput
        name="points"
        label="Strafpunkte"
        min={1}
        defaultValue={getDefaultValueWithFallback("points", 1)}
        required
        labelClassName="mt-4"
      />

      <Textarea
        name="reason"
        label="Begründung"
        hint="optional"
        maxLength={512}
        defaultValue={getDefaultValueWithFallback("reason", "")}
      />

      <DateTimeInput
        name="expiresAt"
        label="Verfällt am"
        hint="optional"
        defaultValue={getDefaultValueWithFallback("expiresAt", "")}
      />

      <SubmitButton icon={<FaSave />} className="mt-4 ml-auto">
        Speichern
      </SubmitButton>

      <ActionErrorNote className="mt-4" state={state} />
    </form>
  );
};
