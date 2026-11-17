import { Actions } from "@/modules/common/components/Actions";
import { Link } from "@/modules/common/components/Link";
import { TRow } from "@/modules/common/components/Table";
import type { ManufacturerSeriesRow } from "@sam-monorepo/application";
import { DeleteSeriesButton } from "./DeleteSeriesButton";

interface Props {
  readonly series: ManufacturerSeriesRow;
}

export const SeriesRow = ({ series }: Props) => {
  const variantNames = series.variants
    .map((variant) => variant.name)
    .join(", ");

  return (
    <TRow>
      <td className="truncate" title={series.name}>
        <Link
          href={`/app/fleet/settings/manufacturer/${series.manufacturerId}/series/${series.id}`}
          className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-700"
          prefetch={false}
        >
          {series.name}
        </Link>
      </td>

      <td className="line-clamp-2" title={variantNames || undefined}>
        {variantNames || "-"}
      </td>

      <td>
        <Actions>
          <DeleteSeriesButton series={{ id: series.id, name: series.name }} />
        </Actions>
      </td>
    </TRow>
  );
};
