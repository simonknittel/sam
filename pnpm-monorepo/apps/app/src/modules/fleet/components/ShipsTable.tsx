import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import {
  VariantStatus,
  type Manufacturer,
  type Series,
  type Ship,
  type Upload,
  type Variant,
  type VariantTag,
} from "@sam-monorepo/database/client";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import { DeleteShip } from "./DeleteShip";
import { EditableShipName } from "./EditableShipName";
import { VariantTagBadge } from "./VariantTagBadge";
import { VariantWithLogo } from "./VariantWithLogo";

interface ShipsTableRow {
  id: Ship["id"];
  ownerId: Ship["ownerId"];
  variantId: Ship["variantId"];
  name: Ship["name"];
  deletedAt?: Date | null;
  variant: Variant & {
    series: Series & {
      manufacturer: Manufacturer & {
        image: Upload | null;
      };
    };
    tags: VariantTag[];
  };
}

const TABLE_MIN_WIDTH = "min-w-140";
const EDITABLE_GRID_COLS =
  "grid-cols-[256px_256px_minmax(256px,1fr)_80px_80px]";
const READONLY_GRID_COLS = "grid-cols-[256px_256px_minmax(256px,1fr)_80px]";

interface Props {
  readonly className?: string;
  readonly ships: ShipsTableRow[];
  /** Own ships get an editable name and a delete action */
  readonly editable?: boolean;
}

export const ShipsTable = ({ className, ships, editable = false }: Props) => {
  const gridCols = editable ? EDITABLE_GRID_COLS : READONLY_GRID_COLS;

  return (
    <Table className={className} tableClassName={TABLE_MIN_WIDTH}>
      <THead className={gridCols}>
        <th>Schiff</th>
        <th>Name</th>
        <th>Tags</th>
        <th className="text-center">Status</th>
        {editable && <th className="text-center">Aktionen</th>}
      </THead>

      <TBody>
        {ships.map((ship) => (
          <TRow key={ship.id} className={gridCols}>
            <td className="overflow-hidden">
              <VariantWithLogo
                variant={ship.variant}
                manufacturer={ship.variant.series.manufacturer}
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
              <div className="overflow-hidden flex flex-wrap gap-1">
                {ship.variant.tags
                  .toSorted((a, b) => a.key.localeCompare(b.key))
                  .map((tag) => (
                    <VariantTagBadge key={tag.id} tag={tag} />
                  ))}
              </div>
            </td>

            <td className="overflow-hidden flex justify-center">
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
              <td className="overflow-hidden flex justify-center">
                {!ship.deletedAt && (
                  <DeleteShip
                    ship={{
                      id: ship.id,
                      ownerId: ship.ownerId,
                      variantId: ship.variantId,
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
