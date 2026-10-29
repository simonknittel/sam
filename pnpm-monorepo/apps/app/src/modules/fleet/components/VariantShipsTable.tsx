import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { type Citizen, type Ship } from "@sam-monorepo/database/client";
import { ShipPopover, type ShipPopoverShip } from "./ShipPopover";

interface VariantShipRow {
  id: Ship["id"];
  ownerId: Ship["ownerId"];
  name: Ship["name"];
  owner: {
    handle: Citizen["handle"];
    deletedAt: Citizen["deletedAt"];
  };
}

const COLUMNS = "160px 256px";

interface Props {
  readonly className?: string;
  readonly ships: VariantShipRow[];
  /** The variant of all ships */
  readonly variant: ShipPopoverShip["variant"];
}

export const VariantShipsTable = ({ className, ships, variant }: Props) => {
  return (
    <Table className={className} columns={COLUMNS} minWidth={560}>
      <THead>
        <th>Citizen</th>
        <th>Name</th>
      </THead>

      <TBody>
        {ships.map((ship) => (
          <TRow key={ship.id}>
            <td className="overflow-hidden">
              <CitizenLink
                citizen={{
                  id: ship.ownerId,
                  handle: ship.owner.handle,
                  deletedAt: ship.owner.deletedAt,
                }}
                className="block rounded-secondary p-2 hover:bg-white/10 hover:no-underline! focus-visible:bg-white/10"
              />
            </td>

            <td className="overflow-hidden">
              {ship.name && (
                <ShipPopover
                  ship={{ name: ship.name, variant }}
                  triggerClassName="max-w-full cursor-pointer underline decoration-dotted underline-offset-4 hover:text-interaction-500 focus-visible:text-interaction-500 active:text-interaction-300"
                >
                  <span className="block truncate" title={ship.name}>
                    {ship.name}
                  </span>
                </ShipPopover>
              )}
            </td>
          </TRow>
        ))}
      </TBody>
    </Table>
  );
};
