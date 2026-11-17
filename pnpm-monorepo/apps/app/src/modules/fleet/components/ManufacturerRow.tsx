import { Actions } from "@/modules/common/components/Actions";
import { Link } from "@/modules/common/components/Link";
import { TRow } from "@/modules/common/components/Table";
import type { ManufacturerRow as ManufacturerRowData } from "@sam-monorepo/application";
import { DeleteManufacturerButton } from "./DeleteManufacturerButton";
import { ManufacturerLogo } from "./ManufacturerLogo";

interface Props {
  readonly manufacturer: ManufacturerRowData;
}

export const ManufacturerRow = ({ manufacturer }: Props) => {
  const seriesNames = manufacturer.series
    .map((series) => series.name)
    .join(", ");

  return (
    <TRow>
      <td>
        <ManufacturerLogo manufacturer={manufacturer} size={48} />
      </td>

      <td className="truncate" title={manufacturer.name}>
        <Link
          href={`/app/fleet/settings/manufacturer/${manufacturer.id}`}
          className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-700"
          prefetch={false}
        >
          {manufacturer.name}
        </Link>
      </td>

      <td className="line-clamp-2" title={seriesNames || undefined}>
        {manufacturer.series.length > 0
          ? manufacturer.series.map((series, index) => (
              <span key={series.id}>
                {index > 0 && ", "}
                <Link
                  href={`/app/fleet/settings/manufacturer/${manufacturer.id}/series/${series.id}`}
                  className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 active:text-brand-red-700"
                  prefetch={false}
                >
                  {series.name}
                </Link>
              </span>
            ))
          : "-"}
      </td>

      <td>
        <Actions>
          <DeleteManufacturerButton
            manufacturer={{ id: manufacturer.id, name: manufacturer.name }}
          />
        </Actions>
      </td>
    </TRow>
  );
};
