"use client";

import { EditableField } from "@/modules/common/components/form/EditableField";
import {
  ShipAcquisitionSource,
  type Ship,
} from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { updateShipAction } from "../actions/updateShipAction";
import { ACQUISITION_SOURCE_LABEL } from "../utils/acquisitionSourceLabel";

const isShipAcquisitionSource = (
  value: unknown,
): value is ShipAcquisitionSource =>
  Object.values<unknown>(ShipAcquisitionSource).includes(value);

interface Props {
  readonly className?: string;
  readonly shipId: Ship["id"];
  readonly acquisitionSource: ShipAcquisitionSource | null;
}

/** A set acquisition source cannot become unknown again */
export const EditableShipAcquisitionSource = ({
  className,
  shipId,
  acquisitionSource,
}: Props) => {
  return (
    <EditableField
      className={className}
      displayButtonClassName="hover:cursor-pointer"
      saveButtonClassName="hover:cursor-pointer"
      rowId={shipId}
      columnName="acquisitionSource"
      initialValue={acquisitionSource}
      action={updateShipAction}
      parseSubmittedValue={(submittedValue) =>
        isShipAcquisitionSource(submittedValue) ? submittedValue : null
      }
      renderInput={({ value, isPending, setInputElement }) => (
        <select
          name="acquisitionSource"
          defaultValue={value ?? ""}
          disabled={isPending}
          className={clsx("w-full rounded-secondary bg-neutral-700 px-1", {
            "animate-pulse": isPending,
          })}
          aria-label="Herkunft"
          autoFocus
          required
          ref={setInputElement}
        >
          <option value="" disabled>
            Bitte auswählen
          </option>
          {Object.values(ShipAcquisitionSource).map((source) => (
            <option key={source} value={source}>
              {ACQUISITION_SOURCE_LABEL[source]}
            </option>
          ))}
        </select>
      )}
      renderDisplay={(value) => (value ? ACQUISITION_SOURCE_LABEL[value] : "-")}
    />
  );
};
