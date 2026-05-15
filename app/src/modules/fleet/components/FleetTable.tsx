import {
  VariantStatus,
  type Manufacturer,
  type Series,
  type Upload,
  type Variant,
  type VariantTag,
} from "@/generated/prisma/client";
import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
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

const TABLE_MIN_WIDTH = "min-w-140";
const GRID_COLS = "grid-cols-[256px_1fr_80px_80px]";

interface Props {
  readonly className?: string;
  readonly fleet: FleetRow[];
}

export const FleetTable = ({ className, fleet }: Props) => {
  return (
    <Table className={className} tableClassName={TABLE_MIN_WIDTH}>
      <THead className={GRID_COLS}>
        <th>Schiff</th>
        <th>Tags</th>
        <th className="text-center">Status</th>
        <th className="text-right">Anzahl</th>
      </THead>

      <TBody>
        {fleet.map((row) => (
          <TRow key={row.variant.id} className={GRID_COLS}>
            <td className="overflow-hidden">
              <Link
                href={`/app/fleet/variant/${row.variant.id}`}
                className="hover:bg-white/10 focus-visible:bg-white/10 rounded-secondary block"
                prefetch={false}
              >
                <VariantWithLogo
                  variant={row.variant}
                  manufacturer={row.variant.series.manufacturer}
                />
              </Link>
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

            <td className="overflow-hidden text-right">{row.count || null}</td>
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};
