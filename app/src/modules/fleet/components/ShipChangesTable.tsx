import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { ShipChangeRow } from "@/modules/fleet/queries";
import { clsx } from "clsx";
import { VariantWithLogo } from "./VariantWithLogo";

const TABLE_MIN_WIDTH = "min-w-160";
const GRID_COLS = "grid-cols-[160px_100px_256px_1fr_1fr]";

interface Props {
  readonly className?: string;
  readonly changes: ShipChangeRow[];
}

export const ShipChangesTable = ({ className, changes }: Props) => {
  return (
    <Table className={className} tableClassName={TABLE_MIN_WIDTH}>
      <THead className={GRID_COLS}>
        <th>Datum</th>
        <th>Typ</th>
        <th>Variant</th>
        <th>Schiff</th>
        <th>Akteur</th>
      </THead>

      <TBody>
        {changes.map((change, index) => (
          <TRow
            key={`${change.ship.id}:${change.changeType}:${index}`}
            className={GRID_COLS}
          >
            <td>{formatDate(change.changeDate)}</td>

            <td
              className={clsx("font-mono uppercase", {
                "text-green-400": change.changeType === "creation",
                "text-red-400": change.changeType === "deletion",
              })}
            >
              {change.changeType === "creation" ? "Erstellt" : "Gelöscht"}
            </td>

            <td className="overflow-hidden">
              <Link
                href={`/app/fleet/variant/${change.ship.variantId}`}
                className="hover:bg-white/10 focus-visible:bg-white/10 rounded-secondary block"
                prefetch={false}
              >
                <VariantWithLogo
                  variant={change.ship.variant}
                  manufacturer={change.ship.variant.series.manufacturer}
                />
              </Link>
            </td>

            <td title={change.ship.name || undefined} className="truncate">
              {change.ship.name}
            </td>

            <td>
              {change.actorId && (
                <CitizenLink
                  citizen={{
                    id: change.actorId,
                    handle: change.actorHandle ?? null,
                  }}
                  className="hover:bg-white/10 focus-visible:bg-white/10 hover:no-underline! rounded-secondary p-2 block"
                />
              )}
            </td>
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};
