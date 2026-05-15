import {
  type Entity,
  type Manufacturer,
  type Series,
  type Ship,
  type Upload,
  type Variant,
} from "@/generated/prisma/client";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { VariantWithLogo } from "./VariantWithLogo";

export interface VariantShipRow {
  id: Ship["id"];
  ownerId: Ship["ownerId"];
  variantId: Ship["variantId"];
  name: Ship["name"];
  citizenHandle: Entity["handle"] | null;
  citizenId: Entity["id"] | null;
  variant: Variant & {
    series: Series & {
      manufacturer: Manufacturer & {
        image: Upload | null;
      };
    };
  };
}

const TABLE_MIN_WIDTH = "min-w-140";
const GRID_COLS = "grid-cols-[256px_160px_256px]";

interface Props {
  readonly className?: string;
  readonly ships: VariantShipRow[];
}

export const VariantShipsTable = ({ className, ships }: Props) => {
  return (
    <Table className={className} tableClassName={TABLE_MIN_WIDTH}>
      <THead className={GRID_COLS}>
        <th>Schiff</th>
        <th>Citizen</th>
        <th>Name</th>
      </THead>

      <TBody>
        {ships.map((ship) => (
          <TRow key={ship.id} className={GRID_COLS}>
            <td className="overflow-hidden">
              <VariantWithLogo
                variant={ship.variant}
                manufacturer={ship.variant.series.manufacturer}
              />
            </td>

            <td className="overflow-hidden">
              {ship.citizenId && (
                <CitizenLink
                  citizen={{ id: ship.citizenId, handle: ship.citizenHandle }}
                />
              )}
            </td>

            <td title={ship.name || ""} className="truncate">
              {ship.name || null}
            </td>
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};
