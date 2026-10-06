import { Actions } from "@/modules/common/components/Actions";
import { Link } from "@/modules/common/components/Link";
import { Tile } from "@/modules/common/components/Tile";
import { type Manufacturer } from "@sam-monorepo/database/client";
import clsx from "clsx";
import { getSeriesByManufacturerId } from "../queries/getSeriesByManufacturerId";
import { CreateSeriesButton } from "./CreateSeriesButton";
import { DeleteSeriesButton } from "./DeleteSeriesButton";

interface Props {
  readonly className?: string;
  readonly manufacturer: Pick<Manufacturer, "id" | "name">;
}

const GRID_COLS = "grid-cols-[128px_1fr_44px]";

export const SeriesTile = async ({ className, manufacturer }: Props) => {
  const series = await getSeriesByManufacturerId(manufacturer.id);

  return (
    <Tile
      heading="Serien"
      cta={
        <CreateSeriesButton
          manufacturer={{ id: manufacturer.id, name: manufacturer.name }}
        />
      }
      className={clsx(className)}
      childrenClassName="overflow-auto"
    >
      <table className="w-full min-w-80">
        <thead>
          <tr
            className={clsx(
              "grid items-center gap-4 text-left text-neutral-500",
              GRID_COLS,
            )}
          >
            <th>Name</th>

            <th>Varianten</th>
          </tr>
        </thead>

        <tbody>
          {series.map((row) => {
            const variantNames = row.variants
              .map((variant) => variant.name)
              .join(", ");

            return (
              <tr
                key={row.id}
                className={clsx(
                  "-mx-2 grid h-14 items-center gap-4 rounded-secondary px-2 first:mt-2",
                  GRID_COLS,
                )}
              >
                <td className="truncate" title={row.name}>
                  <Link
                    href={`/app/fleet/settings/manufacturer/${manufacturer.id}/series/${row.id}`}
                    className="text-brand-red-500 hover:text-brand-red-300"
                    prefetch={false}
                  >
                    {row.name}
                  </Link>
                </td>

                <td className="line-clamp-2" title={variantNames}>
                  {variantNames}
                </td>

                <td>
                  <Actions>
                    <DeleteSeriesButton series={row} />
                  </Actions>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Tile>
  );
};
