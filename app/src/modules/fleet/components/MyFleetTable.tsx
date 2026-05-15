import {
  VariantStatus,
  type Manufacturer,
  type Series,
  type Ship,
  type Upload,
  type Variant,
  type VariantTag,
} from "@/generated/prisma/client";
import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import { DeleteShip } from "./DeleteShip";
import { EditableShipName } from "./EditableShipName";
import { VariantTagBadge } from "./VariantTagBadge";
import { VariantWithLogo } from "./VariantWithLogo";

export interface MyFleetRow {
  id: Ship["id"];
  ownerId: Ship["ownerId"];
  variantId: Ship["variantId"];
  name: Ship["name"];
  deletedAt: Date | null;
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
const GRID_COLS = "grid-cols-[256px_256px_minmax(256px,1fr)_80px_80px]";

interface Props {
  readonly className?: string;
  readonly ships: MyFleetRow[];
}

export const MyFleetTable = ({ className, ships }: Props) => {
  return (
    <Table className={className} tableClassName={TABLE_MIN_WIDTH}>
      <THead className={GRID_COLS}>
        <th>Schiff</th>
        <th>Name</th>
        <th>Tags</th>
        <th className="text-center">Status</th>
        <th className="text-center">Aktionen</th>
      </THead>

      <TBody>
        {ships.map((ship) => (
          <TRow key={ship.id} className={GRID_COLS}>
            <td className="overflow-hidden">
              <Link
                href={`/app/fleet/variant/${ship.variant.id}`}
                className="hover:bg-white/10 focus-visible:bg-white/10 rounded-secondary block"
                prefetch={false}
              >
                <VariantWithLogo
                  variant={ship.variant}
                  manufacturer={ship.variant.series.manufacturer}
                />
              </Link>
            </td>

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
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};
