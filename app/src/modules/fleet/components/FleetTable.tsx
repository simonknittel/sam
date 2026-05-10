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
      <thead>
        <tr
          className={clsx(
            "grid items-center gap-4 [&>th]:text-white/40 [&>th]:p-0 [&>th]:font-mono [&>th]:uppercase",
            GRID_COLS,
          )}
        >
          <th className="text-left">Schiff</th>
          <th className="text-left">Tags</th>
          <th className="text-center">Status</th>
          <th className="text-right">Anzahl</th>
        </tr>
      </thead>

      <tbody>
        {fleet.map((row) => (
          <tr
            key={row.variant.id}
            className={clsx(
              "grid items-center gap-4 px-2 py-1 rounded-secondary -mx-2 first:mt-2",
              GRID_COLS,
            )}
          >
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
          </tr>
        ))}
      </tbody>
    </table>
  );
};
