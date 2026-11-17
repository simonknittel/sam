import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { type Manufacturer } from "@sam-monorepo/database/client";
import { getSeriesByManufacturerId } from "../queries/getSeriesByManufacturerId";
import { CreateSeriesButton } from "./CreateSeriesButton";
import { SeriesRow } from "./SeriesRow";

const COLUMNS: TableColumn[] = [
  { key: "name", label: "Name", track: "minmax(160px,1fr)", minWidth: 160 },
  {
    key: "variants",
    label: "Varianten",
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

interface Props {
  readonly className?: string;
  readonly manufacturer: Pick<Manufacturer, "id" | "name">;
}

export const SeriesTile = async ({ className, manufacturer }: Props) => {
  const series = await getSeriesByManufacturerId(manufacturer.id);

  return (
    <TableTile
      className={className}
      heading="Serien"
      cta={
        <CreateSeriesButton
          manufacturer={{ id: manufacturer.id, name: manufacturer.name }}
        />
      }
      columns={COLUMNS}
      isEmpty={series.length === 0}
      emptyMessage="Keine Serien vorhanden"
    >
      {series.map((row) => (
        <SeriesRow key={row.id} series={row} />
      ))}
    </TableTile>
  );
};
