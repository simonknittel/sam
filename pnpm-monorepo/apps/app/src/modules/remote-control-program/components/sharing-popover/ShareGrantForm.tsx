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
import { ShareGrantFormField } from "../../utils/shareGrantFormFields";
import { CapabilityFields } from "./CapabilityFields";
import { GranteeFields } from "./GranteeFields";
import { useSharingPopoverAction } from "./useSharingPopoverQuery";
import { ValidityFields } from "./ValidityFields";

interface FormProblem {
  readonly field: ShareGrantFormField;
  readonly message: string;
}

/** The checks that the browser cannot do with the attributes of the fields */
const findFormProblem = (formData: FormData): FormProblem | null => {
  const granteeKind = formData.get(ShareGrantFormField.GranteeKind);

  if (
    granteeKind === GranteeKind.citizen &&
    !formData.get(ShareGrantFormField.CitizenId)
  )
    return {
      field: ShareGrantFormField.CitizenId,
      message: "Wähle einen Citizen aus.",
    };

  if (
    granteeKind === GranteeKind.role &&
    formData.getAll(ShareGrantFormField.RoleIds).length <= 0
  )
    return {
      field: ShareGrantFormField.RoleIds,
      message: "Wähle mindestens eine Rolle aus.",
    };

  if (formData.getAll(ShareGrantFormField.CapabilityIds).length <= 0)
    return {
      field: ShareGrantFormField.CapabilityIds,
      message: "Wähle aus, welche Daten du teilst.",
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
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const getProblemMessage = (field: ShareGrantFormField) =>
    problem?.field === field ? problem.message : null;
  const capabilitiesError = getProblemMessage(
    ShareGrantFormField.CapabilityIds,
  );

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const newProblem = findFormProblem(new FormData(event.currentTarget));
    setProblem(newProblem);

    if (newProblem) {
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
        citizenError={getProblemMessage(ShareGrantFormField.CitizenId)}
        rolesError={getProblemMessage(ShareGrantFormField.RoleIds)}
        onRolesChange={() => setProblem(null)}
      />

      <CapabilityFields />

      <ValidityFields />

      {capabilitiesError && (
        <div role="alert">
          <Note type="error" message={capabilitiesError} />
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
