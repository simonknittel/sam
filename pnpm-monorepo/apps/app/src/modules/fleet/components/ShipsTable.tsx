import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { VariantStatus, type Ship } from "@sam-monorepo/database/client";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import type { ShipVariant } from "../queries/shipQuery";
import { ACQUISITION_SOURCE_LABEL } from "../utils/acquisitionSourceLabel";
import { DeleteShip } from "./DeleteShip";
import { EditableShipAcquisitionSource } from "./EditableShipAcquisitionSource";
import { EditableShipName } from "./EditableShipName";
import { EditableShipNote } from "./EditableShipNote";
import { VariantTagBadge } from "./VariantTagBadge";
import { VariantWithLogo } from "./VariantWithLogo";

interface ShipsTableRow {
  id: Ship["id"];
  name: Ship["name"];
  acquisitionSource: Ship["acquisitionSource"];
  note: Ship["note"];
  deletedAt?: Date | null;
  variant: ShipVariant;
}

const EDITABLE_COLUMNS =
  "256px 200px 160px minmax(200px,1fr) minmax(200px,1fr) 80px 80px";
const READONLY_COLUMNS =
  "256px 200px 160px minmax(200px,1fr) minmax(200px,1fr) 80px";

interface Props {
  readonly className?: string;
  readonly ships: ShipsTableRow[];
  /** Own ships get an editable name and a delete action */
  readonly editable?: boolean;
}

export const ShipsTable = ({ className, ships, editable = false }: Props) => {
  const columns = editable ? EDITABLE_COLUMNS : READONLY_COLUMNS;

  return (
    <Table className={className} columns={columns} minWidth={560}>
      <THead>
        <th>Schiff</th>
        <th>Name</th>
        <th>Herkunft</th>
        <th>Notiz</th>
        <th>Tags</th>
        <th className="text-center">Status</th>
        {editable && <th className="text-center">Aktionen</th>}
      </THead>

      <TBody>
        {ships.map((ship) => (
          <TRow key={ship.id}>
            <td className="overflow-hidden">
              <VariantWithLogo
                variant={ship.variant}
                manufacturer={ship.variant.series.manufacturer}
                ship={ship}
                fullWidth
              />
            </td>

            {editable ? (
              <td className="overflow-hidden">
                {ship.deletedAt ? (
                  ship.name
                ) : (
                  <EditableShipName
                    key={ship.id}
                    shipId={ship.id}
                    name={ship.name || ""}
                    className="[&>button]:text-left"
                  />
                )}
              </td>
            ) : (
              <td title={ship.name || undefined} className="truncate">
                {ship.name || null}
              </td>
            )}

            <td className="overflow-hidden">
              {editable && !ship.deletedAt ? (
                <EditableShipAcquisitionSource
                  key={ship.id}
                  shipId={ship.id}
                  acquisitionSource={ship.acquisitionSource}
                  className="[&>button]:text-left"
                />
              ) : ship.acquisitionSource ? (
                ACQUISITION_SOURCE_LABEL[ship.acquisitionSource]
              ) : (
                "-"
              )}
            </td>

            {editable && !ship.deletedAt ? (
              <td className="overflow-hidden">
                <EditableShipNote
                  key={ship.id}
                  shipId={ship.id}
                  note={ship.note || ""}
                  className="[&>button]:text-left"
                />
              </td>
            ) : (
              <td
                title={ship.note || undefined}
                className="line-clamp-2 wrap-break-word"
              >
                {ship.note}
              </td>
            )}

            <td className="overflow-hidden">
              <div className="flex flex-wrap gap-1 overflow-hidden">
                {ship.variant.tags
                  .toSorted((a, b) => a.key.localeCompare(b.key))
                  .map((tag) => (
                    <VariantTagBadge key={tag.id} tag={tag} />
                  ))}
              </div>
            </td>

            <td className="flex justify-center overflow-hidden">
              {ship.variant.status === VariantStatus.FLIGHT_READY && (
                <FaRegCheckCircle title="Flight ready" />
              )}
              {ship.variant.status === VariantStatus.NOT_FLIGHT_READY && (
                <FaRegCircleXmark
                  title="Nicht flight ready"
                  className="text-brand-red-500"
                />
              )}
            </td>

            {editable && (
              <td className="flex justify-center overflow-hidden">
                {!ship.deletedAt && (
                  <DeleteShip
                    ship={{
                      id: ship.id,
                      name: ship.name,
                      variant: ship.variant,
                    }}
                  />
                )}
              </td>
            )}
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};
