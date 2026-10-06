import { useAction } from "@/modules/actions/utils/useAction";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { FaSave } from "react-icons/fa";
import { createManufacturer } from "../actions/createManufacturer";

interface Props {
  readonly onRequestClose: () => void;
}

export const CreateManufacturerModal = ({ onRequestClose }: Props) => {
  const { formAction, getDefaultValueWithFallback } = useAction(
    createManufacturer,
    { onSuccess: onRequestClose },
  );

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Hersteller anlegen</h2>}
    >
      <form action={formAction}>
        <TextInput
          name="name"
          label="Name"
          defaultValue={getDefaultValueWithFallback("name", "")}
          required
          autoFocus
        />

        <div className="mt-8 flex justify-end">
          <SubmitButton icon={<FaSave />}>Speichern</SubmitButton>
        </div>
      </form>
    </Modal>
  );
};
