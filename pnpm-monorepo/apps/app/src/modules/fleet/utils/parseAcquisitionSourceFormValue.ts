import { toAcquisitionSource } from "@sam-monorepo/application";
import { ShipAcquisitionSource } from "@sam-monorepo/database/browser";

const isShipAcquisitionSource = (
  value: unknown,
): value is ShipAcquisitionSource =>
  Object.values<unknown>(ShipAcquisitionSource).includes(value);

/**
 * The forms send the value of the database. The schema of the use case
 * rejects all other values.
 */
export const parseAcquisitionSourceFormValue = (
  value: FormDataEntryValue | null,
) => (isShipAcquisitionSource(value) ? toAcquisitionSource(value) : value);
