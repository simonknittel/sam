import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Table, TBody, THead, TRow } from "@/modules/common/components/Table";
import { type Entity, type Ship } from "@sam-monorepo/database/client";

interface VariantShipRow {
  id: Ship["id"];
  ownerId: Ship["ownerId"];
  name: Ship["name"];
  owner: {
    handle: Entity["handle"];
  };
}

const COLUMNS = "160px 256px";

interface Props {
  readonly className?: string;
  readonly ships: VariantShipRow[];
}

export const VariantShipsTable = ({ className, ships }: Props) => {
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
                citizen={{ id: ship.ownerId, handle: ship.owner.handle }}
                className="hover:bg-white/10 focus-visible:bg-white/10 hover:no-underline! rounded-secondary p-2 block"
              />
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
