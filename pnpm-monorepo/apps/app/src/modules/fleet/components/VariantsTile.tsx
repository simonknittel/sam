import {
  TableTile,
  type TableColumn,
} from "@/modules/common/components/TableTile";
import { type Manufacturer, type Series } from "@sam-monorepo/database/client";
import { getVariantsBySeriesId } from "../queries/getVariantsBySeriesId";
import { CreateVariantButton } from "./CreateVariantButton";
import { VariantRow } from "./VariantRow";

const COLUMNS: TableColumn[] = [
  { key: "name", label: "Name", track: "minmax(256px,1fr)", minWidth: 256 },
  { key: "tags", label: "Tags", track: "minmax(200px,1fr)", minWidth: 200 },
  {
    key: "storePrice",
    label: "Wert (USD)",
    track: "128px",
    minWidth: 128,
    headerClassName: "text-right",
  },
  {
    key: "inGamePrice",
    label: "Wert (aUEC)",
    track: "160px",
    minWidth: 160,
    headerClassName: "text-right",
  },
  {
    key: "status",
    label: "Status",
    track: "80px",
    minWidth: 80,
    headerClassName: "text-center",
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
  readonly manufacturerId: Manufacturer["id"];
  readonly seriesId: Series["id"];
}

export const VariantsTile = async ({
  className,
  manufacturerId,
  seriesId,
}: Props) => {
  const variants = await getVariantsBySeriesId(seriesId);

  return (
    <TableTile
      className={className}
      heading="Varianten"
      cta={
        <CreateVariantButton
          manufacturerId={manufacturerId}
          seriesId={seriesId}
        />
      }
      columns={COLUMNS}
      isEmpty={variants.length === 0}
      emptyMessage="Keine Varianten vorhanden"
    >
      {variants.map((variant) => (
        <VariantRow key={variant.id} variant={variant} />
      ))}
    </TableTile>
  );
};
