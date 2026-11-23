"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { GranteeKind } from "@sam-monorepo/domain";
import { useState, type FormEvent } from "react";
import { FaShareNodes } from "react-icons/fa6";
import { createShareGrant } from "../../actions/createShareGrant";
import { CapabilityFields } from "./CapabilityFields";
import { GranteeFields } from "./GranteeFields";
import { ShareGrantFormField } from "./shareGrantFormFields";
import { useSharingPopoverAction } from "./useSharingPopoverQuery";
import { ValidityFields } from "./ValidityFields";

/** The checks that the browser cannot do with the attributes of the fields */
const findFormProblem = (formData: FormData) => {
  if (
    formData.get(ShareGrantFormField.GranteeKind) === GranteeKind.citizen &&
    !formData.get(ShareGrantFormField.CitizenId)
  )
    return { citizenError: "Wähle einen Citizen aus.", formError: null };

  if (formData.getAll(ShareGrantFormField.CapabilityIds).length <= 0)
    return {
      citizenError: null,
      formError: "Wähle aus, welche Daten du teilst.",
    };

  return null;
};

interface Props {
  readonly id: string;
  readonly canChooseCitizen: boolean;
  readonly canChooseRole: boolean;
  /** After a new grant, and after "Abbrechen" */
  readonly onClose: () => void;
}

/**
 * The form for a new grant. The fields keep their values after an error: the
 * form does not use `<form action>`, which React resets after the action.
 */
export const ShareGrantForm = ({
  id,
  canChooseCitizen,
  canChooseRole,
  onClose,
}: Props) => {
  const createGrant = useSharingPopoverAction(createShareGrant);
  const { state, isPending, submitWithoutReset } = useAction(createGrant, {
    errorToast: false,
    onSuccess: onClose,
  });
  const [citizenError, setCitizenError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const problem = findFormProblem(new FormData(event.currentTarget));
    setCitizenError(problem?.citizenError ?? null);
    setFormError(problem?.formError ?? null);

    if (problem) {
      event.preventDefault();
      return;
    }

    submitWithoutReset(event);
  };

  return (
    <form
      id={id}
      onSubmit={handleSubmit}
      aria-label="Neue Freigabe"
      className="flex flex-col gap-4 rounded-secondary border border-white/10 p-3"
    >
      <GranteeFields
        canChooseCitizen={canChooseCitizen}
        canChooseRole={canChooseRole}
        citizenError={citizenError}
      />

      <CapabilityFields />

      <ValidityFields />

      {formError && (
        <div role="alert">
          <Note type="error" message={formError} />
        </div>
      )}

      <ActionErrorNote state={state} />

      <div className="flex justify-end gap-2">
        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          colorSchema={Button2ColorSchema.InteractionMuted}
          onClick={onClose}
        >
          Abbrechen
        </Button2>

        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaShareNodes />}
          Freigeben
        </Button2>
      </div>
    </form>
  );
};
