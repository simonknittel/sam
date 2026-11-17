import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { getManufacturers } from "../queries/getManufacturers";
import { CreateManufacturereButton } from "./CreateManufacturerButton";
import { ManufacturerRow } from "./ManufacturerRow";

const COLUMNS: TableColumn[] = [
  { key: "logo", label: "Logo", track: "48px", minWidth: 48 },
  { key: "name", label: "Name", track: "minmax(192px,1fr)", minWidth: 192 },
  {
    key: "series",
    label: "Serien",
    track: "minmax(240px,3fr)",
    minWidth: 240,
  },
  {
    key: "actions",
    label: "Aktionen",
    track: "44px",
    minWidth: 44,
    headerClassName: "sr-only",
  },
];

export const ManufacturersTile = async () => {
  const manufacturers = await getManufacturers();

  return (
    <TableTile
      heading="Hersteller"
      cta={<CreateManufacturereButton />}
      columns={COLUMNS}
      isEmpty={manufacturers.length === 0}
      emptyMessage="Keine Hersteller vorhanden"
    >
      {manufacturers.map((manufacturer) => (
        <ManufacturerRow key={manufacturer.id} manufacturer={manufacturer} />
      ))}
    </TableTile>
  );
};
