import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { ShipChangeRow as Change } from "@/modules/fleet/queries/getShipChanges";
import { ShipChangeType } from "@sam-monorepo/application";
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
          "text-green-400": change.changeType === ShipChangeType.Creation,
          "text-red-400": change.changeType === ShipChangeType.Deletion,
        })}
      >
        {change.changeType === ShipChangeType.Creation
          ? "Erstellt"
          : "Gelöscht"}
      </td>

      <td className="overflow-hidden">
        <VariantWithLogo
          variant={change.ship.variant}
          manufacturer={change.ship.variant.series.manufacturer}
          ship={change.ship}
          fullWidth
        />
      </td>

      <td title={change.ship.name || undefined} className="truncate">
        {change.ship.name}
      </td>

      <td>
        {change.actor && (
          <CitizenLink
            citizen={change.actor}
            className="block rounded-secondary p-2 hover:bg-white/10 hover:no-underline! focus-visible:bg-white/10"
          />
        )}
      </td>
    </TRow>
  );
};
