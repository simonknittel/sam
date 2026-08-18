import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { ShipChangeRow as Change } from "@/modules/fleet/queries/getShipChanges";
import { clsx } from "clsx";
import { VariantWithLogo } from "./VariantWithLogo";

interface Props {
  readonly change: Change;
}

export const ShipChangeRow = ({ change }: Props) => {
  return (
    <TRow>
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
        <VariantWithLogo
          variant={change.ship.variant}
          manufacturer={change.ship.variant.series.manufacturer}
        />
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
  );
};
