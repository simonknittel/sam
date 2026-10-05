import { useAction } from "@/modules/actions/utils/useAction";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { api } from "@/trpc/react";
import { type Manufacturer } from "@sam-monorepo/database/browser";
import { useId } from "react";
import { FaSave } from "react-icons/fa";
import { createSeries } from "../actions/createSeries";

interface Props {
  readonly onRequestClose: () => void;
  readonly manufacturerId?: Manufacturer["id"];
}

export const CreateSeriesModal = ({
  onRequestClose,
  manufacturerId,
}: Props) => {
  const manufacturerSelectId = useId();
  const manufacturers = api.manufacturer.getAll.useQuery(undefined);
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
        <label className="block" htmlFor={manufacturerSelectId}>
          Hersteller
        </label>

        {manufacturers.isFetching ? (
          <div className="mt-2 h-11 w-full animate-pulse rounded-secondary bg-neutral-900" />
        ) : (
          <Select
            id={manufacturerSelectId}
            name="manufacturerId"
            className="mt-2"
            defaultValue={getDefaultValueWithFallback(
              "manufacturerId",
              manufacturerId,
            )}
            required
            autoFocus={!manufacturerId}
            disabled={Boolean(manufacturerId)}
          >
            {manufacturers.data?.map((manufacturer) => (
              <option key={manufacturer.id} value={manufacturer.id}>
                {manufacturer.name}
              </option>
            ))}
          </Select>
        )}

        {/* A disabled select does not send its value with the form */}
        {manufacturerId && (
          <input type="hidden" name="manufacturerId" value={manufacturerId} />
        )}

        <TextInput
          name="name"
          label="Name"
          className="mt-4"
          defaultValue={getDefaultValueWithFallback("name", "")}
          required
          autoFocus={Boolean(manufacturerId)}
        />

        <div className="mt-4 flex justify-end">
          <SubmitButton icon={<FaSave />} disabled={manufacturers.isFetching}>
            Speichern
          </SubmitButton>
        </div>
      </form>
    </Modal>
  );
};
