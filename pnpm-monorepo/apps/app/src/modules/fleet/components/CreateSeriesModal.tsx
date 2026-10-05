import { useAction } from "@/modules/actions/utils/useAction";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { type Manufacturer } from "@sam-monorepo/database/browser";
import { FaSave } from "react-icons/fa";
import { createSeries } from "../actions/createSeries";

interface Props {
  readonly onRequestClose: () => void;
  readonly manufacturer: Pick<Manufacturer, "id" | "name">;
}

export const CreateSeriesModal = ({ onRequestClose, manufacturer }: Props) => {
  const { formAction, getDefaultValueWithFallback } = useAction(createSeries, {
    onSuccess: onRequestClose,
  });

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-120"
      heading={<h2>Serie anlegen</h2>}
    >
      <form action={formAction}>
        <dl>
          <dt className="text-white/90">Hersteller</dt>
          <dd className="mt-2 truncate" title={manufacturer.name}>
            {manufacturer.name}
          </dd>
        </dl>

        <input type="hidden" name="manufacturerId" value={manufacturer.id} />

        <TextInput
          name="name"
          label="Name"
          className="mt-4"
          defaultValue={getDefaultValueWithFallback("name", "")}
          required
          autoFocus
        />

        <div className="mt-4 flex justify-end">
          <SubmitButton icon={<FaSave />}>Speichern</SubmitButton>
        </div>
      </form>
    </Modal>
  );
};
