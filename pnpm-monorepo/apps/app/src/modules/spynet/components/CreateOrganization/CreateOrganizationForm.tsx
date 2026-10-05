import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { createOrganization } from "@/modules/organizations/actions/createOrganization";
import { FaSave } from "react-icons/fa";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreateOrganizationForm = ({ className, onSuccess }: Props) => {
  const { state, formAction, getDefaultValueWithFallback } = useAction(
    createOrganization,
    {
      errorToast: false,
      onSuccess,
    },
  );

  return (
    <form action={formAction} className={className}>
      <TextInput
        name="spectrumId"
        label="Spectrum ID"
        required
        autoFocus
        defaultValue={getDefaultValueWithFallback("spectrumId", "")}
      />

      <TextInput
        name="name"
        label="Name"
        className="mt-4"
        required
        defaultValue={getDefaultValueWithFallback("name", "")}
      />

      <ActionErrorNote className="mt-4" state={state} />

      <div className="mt-8 flex justify-end">
        <SubmitButton icon={<FaSave />}>Anlegen</SubmitButton>
      </div>
    </form>
  );
};
