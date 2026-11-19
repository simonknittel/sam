"use client";

import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { Select } from "@/modules/common/components/form/Select";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { api } from "@/trpc/react";
import { ShipAcquisitionSource } from "@sam-monorepo/database/browser";
import { useId } from "react";
import { FaSave } from "react-icons/fa";
import { createShipAction } from "../actions/createShipAction";
import type { VariantCatalog } from "../queries/getVariantCatalog";
import { ACQUISITION_SOURCE_LABEL } from "../utils/acquisitionSourceLabel";
import { VariantPicker } from "./VariantPicker/VariantPicker";

interface Props {
  readonly onSuccess?: () => void;
}

export const CreateShipForm = ({ onSuccess }: Props) => {
  const { data, isPending, isError } = api.variant.getAll.useQuery(undefined);

  if (isPending)
    return (
      <div className="flex items-center justify-center p-8">
        <AsciiSpinner className="text-5xl text-neutral-500" />
      </div>
    );

  if (isError)
    return (
      <p className="text-sm text-brand-red-300">
        Die Schiffe konnten nicht geladen werden.
      </p>
    );

  return <Form catalog={data} onSuccess={onSuccess} />;
};

interface FormProps {
  readonly catalog: VariantCatalog;
  readonly onSuccess?: () => void;
}

const Form = ({ catalog, onSuccess }: FormProps) => {
  const acquisitionSourceId = useId();
  const nameId = useId();
  const noteId = useId();
  const { state, isPending, submitWithoutReset } = useAction(createShipAction, {
    errorToast: false,
    onSuccess: () => onSuccess?.(),
  });

  return (
    <form onSubmit={submitWithoutReset}>
      <VariantPicker
        catalog={catalog}
        name="variantId"
        label="Schiff"
        required
        autoFocus
      />

      <label className="mt-6 block" htmlFor={acquisitionSourceId}>
        Herkunft
      </label>
      <Select
        name="acquisitionSource"
        className="mt-2"
        id={acquisitionSourceId}
        defaultValue=""
        required
      >
        <option value="" disabled>
          Bitte auswählen
        </option>
        {Object.values(ShipAcquisitionSource).map((source) => (
          <option key={source} value={source}>
            {ACQUISITION_SOURCE_LABEL[source]}
          </option>
        ))}
      </Select>

      <TextInput
        label="Schiffsname"
        name="name"
        className="mt-6"
        id={nameId}
        hint="optional"
      />

      <TextInput
        label="Notiz"
        name="note"
        className="mt-6"
        id={noteId}
        maxLength={255}
        hint="optional"
      />

      <ActionErrorNote className="mt-6" state={state} />

      <div className="mt-8 flex justify-end">
        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Hinzufügen
        </Button2>
      </div>
    </form>
  );
};
