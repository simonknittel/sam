import { THead, TRow } from "@/modules/common/components/Table";
import {
  VariantStatus,
  type Manufacturer,
  type Series,
  type Upload,
  type Variant,
  type VariantTag,
} from "@prisma/client";
import clsx from "clsx";
import { FaRegCheckCircle } from "react-icons/fa";
import { FaRegCircleXmark } from "react-icons/fa6";
import { VariantTagBadge } from "./VariantTagBadge";
import { VariantWithLogo } from "./VariantWithLogo";

export interface FleetRow {
  variant: Variant & {
    series: Series & {
      manufacturer: Manufacturer & {
        image: Upload | null;
      };
    };
    tags: VariantTag[];
  };
  count: number;
}

interface Props {
  readonly className?: string;
  readonly fleet: FleetRow[];
}

const GRID_COLS = "grid-cols-[256px_1fr_80px_80px]";

export const FleetTable = ({ className, fleet }: Props) => {
  return (
    <table className={clsx("w-full min-w-140", className)}>
      <THead className={GRID_COLS}>
        <th>Schiff</th>
        <th>Tags</th>
        <th className="text-center">Status</th>
        <th className="text-right">Anzahl</th>
      </THead>

      <tbody>
        {fleet.map((row) => (
          <TRow key={row.variant.id} className={GRID_COLS}>
            <td className="overflow-hidden">
              <VariantWithLogo
                variant={row.variant}
                manufacturer={row.variant.series.manufacturer}
              />
            </td>

            <td className="overflow-hidden">
              <div className="overflow-hidden flex flex-wrap gap-1">
                {row.variant.tags
                  .toSorted((a, b) => a.key.localeCompare(b.key))
                  .map((tag) => (
                    <VariantTagBadge key={tag.id} tag={tag} />
                  ))}
              </div>
            </td>

            <td className="overflow-hidden flex justify-center">
              {row.variant.status === VariantStatus.FLIGHT_READY && (
                <FaRegCheckCircle title="Flight ready" />
              )}
              {row.variant.status === VariantStatus.NOT_FLIGHT_READY && (
                <FaRegCircleXmark
                  title="Nicht flight ready"
                  className="text-brand-red-500"
                />
              )}
            </td>

            <td className="overflow-hidden text-right">{row.count}</td>
          </TRow>
        ))}
      </tbody>
    </table>
  );
};
